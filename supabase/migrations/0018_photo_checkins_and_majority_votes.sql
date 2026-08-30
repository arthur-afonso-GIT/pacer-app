begin;

create table public.submission_votes (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  decision public.review_decision not null check (decision in ('approved', 'rejected')),
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  primary key (submission_id, voter_id)
);

create index submission_votes_tally_idx
  on public.submission_votes(submission_id, decision);

alter table public.submission_votes enable row level security;
create policy submission_votes_read_member
on public.submission_votes for select to authenticated
using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id and public.is_challenge_member(s.challenge_id)
  )
);
revoke insert, update, delete on public.submission_votes from anon, authenticated;

-- New check-ins must explain the activity. Evidence is uploaded immediately after
-- this insert and is required by the queue/voting RPC before anybody can vote.
drop policy submissions_create_self on public.submissions;
create policy submissions_create_self
on public.submissions for insert to authenticated
with check (
  submitter_id = auth.uid()
  and status = 'pending'
  and char_length(trim(coalesce(note, ''))) between 3 and 500
  and public.is_challenge_member(challenge_id)
  and exists (
    select 1 from public.challenges c
    where c.id = challenge_id
      and c.status = 'active'
      and now() >= c.starts_at
      and now() < c.ends_at
  )
);

create or replace function public.get_review_queue(p_challenge_id uuid)
returns setof public.submissions
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select s.* from public.submissions s
  join public.challenges c on c.id = s.challenge_id
  where s.challenge_id = p_challenge_id
    and s.status in ('pending', 'disputed')
    and s.submitter_id <> auth.uid()
    and public.is_challenge_member(c.id)
    and exists (
      select 1 from public.evidence e
      where e.submission_id = s.id
        and e.media_type in ('image/jpeg', 'image/png', 'image/webp')
    )
    and (
      (s.status = 'disputed' and public.is_group_admin(c.group_id))
      or
      (s.status = 'pending' and not exists (
        select 1 from public.submission_votes sv
        where sv.submission_id = s.id and sv.voter_id = auth.uid()
      ))
    )
  order by case when s.status = 'disputed' then 0 else 1 end, s.submitted_at;
$$;

create function public.vote_submission(
  p_submission_id uuid,
  p_decision public.review_decision,
  p_reason text
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  s public.submissions%rowtype;
  c public.challenges%rowtype;
  result public.submissions%rowtype;
  eligible_voters integer;
  required_votes integer;
  approval_votes integer;
  rejection_votes integer;
  configured_points integer;
  final_decision public.review_decision;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'vote must approve or reject' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'vote reason must contain between 3 and 500 characters' using errcode = '22023';
  end if;

  select * into s from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'submission not found' using errcode = 'P0002'; end if;
  if s.status not in ('pending', 'disputed') then
    raise exception 'submission is not reviewable' using errcode = '55000';
  end if;
  if s.submitter_id = auth.uid() then
    raise exception 'self-review is forbidden' using errcode = '42501';
  end if;

  select * into c from public.challenges where id = s.challenge_id;
  if not public.is_challenge_member(c.id) then
    raise exception 'voter is not an active challenge member' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.evidence e
    where e.submission_id = s.id
      and e.media_type in ('image/jpeg', 'image/png', 'image/webp')
  ) then
    raise exception 'a photo is required before voting' using errcode = '23514';
  end if;

  select ch.points into configured_points
  from public.challenge_habits ch
  where ch.id = s.challenge_habit_id and ch.challenge_id = s.challenge_id;

  -- Contested decisions remain an administrative appeal and are resolved at once.
  if s.status = 'disputed' then
    if not public.is_group_admin(c.group_id) then
      raise exception 'disputes require a group administrator' using errcode = '42501';
    end if;
    final_decision := p_decision;
  else
    insert into public.submission_votes(submission_id, voter_id, decision, reason)
    values (s.id, auth.uid(), p_decision, trim(p_reason));

    select count(*) into eligible_voters
    from public.challenge_members cm
    where cm.challenge_id = s.challenge_id
      and cm.status = 'active'
      and cm.user_id <> s.submitter_id;
    if eligible_voters < 1 then
      raise exception 'at least one other active member is required' using errcode = '55000';
    end if;
    required_votes := floor(eligible_voters / 2.0)::integer + 1;

    select
      count(*) filter (where decision = 'approved'),
      count(*) filter (where decision = 'rejected')
    into approval_votes, rejection_votes
    from public.submission_votes
    where submission_id = s.id;

    insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
    values (
      auth.uid(), 'submission.voted', 'submission', s.id, c.group_id,
      jsonb_build_object(
        'decision', p_decision, 'approvals', approval_votes,
        'rejections', rejection_votes, 'required', required_votes
      )
    );

    if approval_votes >= required_votes then
      final_decision := 'approved';
    elsif rejection_votes >= required_votes then
      final_decision := 'rejected';
    else
      return s;
    end if;
  end if;

  insert into public.reviews(submission_id, reviewer_id, decision, points, reason)
  values (
    s.id, auth.uid(), final_decision,
    case when final_decision = 'approved' then configured_points else null end,
    case when s.status = 'disputed'
      then trim(p_reason)
      else format('Maioria do grupo atingida. Último voto: %s', trim(p_reason))
    end
  );

  update public.submissions
  set status = final_decision::text::public.submission_status,
      resolved_at = now(), updated_at = now()
  where id = s.id
  returning * into result;

  insert into public.submission_status_history(submission_id, from_status, to_status, actor_id, reason)
  values (s.id, s.status, result.status, auth.uid(), 'Maioria do grupo atingida');

  if final_decision = 'approved' then
    insert into public.point_transactions(challenge_id, user_id, submission_id, kind, points, created_by)
    values (s.challenge_id, s.submitter_id, s.id, 'award', configured_points, auth.uid())
    on conflict (submission_id, kind) do nothing;
  end if;

  insert into public.notifications(user_id, type, title, body, data)
  values (
    s.submitter_id,
    (case when final_decision = 'approved' then 'points' else 'review' end)::public.notification_type,
    case when final_decision = 'approved' then 'Atividade validada' else 'Atividade não validada' end,
    case when final_decision = 'approved'
      then format('A maioria validou sua atividade. Você ganhou %s pontos.', configured_points)
      else 'A maioria do grupo não validou esta atividade.'
    end,
    jsonb_build_object('submission_id', s.id, 'challenge_id', s.challenge_id)
  );

  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (
    auth.uid(), 'submission.majority_resolved', 'submission', s.id, c.group_id,
    jsonb_build_object('decision', final_decision, 'points', case when final_decision = 'approved' then configured_points else null end)
  );
  return result;
end
$$;

revoke all on function public.vote_submission(uuid, public.review_decision, text) from public, anon;
grant execute on function public.vote_submission(uuid, public.review_decision, text) to authenticated;

commit;
