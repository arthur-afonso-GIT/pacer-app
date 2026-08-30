begin;

alter table public.reviews drop constraint reviews_submission_id_key;
create index reviews_submission_created_idx
  on public.reviews(submission_id, created_at desc);

create function public.dispute_submission(p_submission_id uuid, p_reason text)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  submission_row public.submissions%rowtype;
  challenge_row public.challenges%rowtype;
  result public.submissions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 10 or char_length(trim(p_reason)) > 1000 then
    raise exception 'dispute reason must contain between 10 and 1000 characters' using errcode = '22023';
  end if;

  select * into submission_row
  from public.submissions
  where id = p_submission_id
  for update;
  if not found then
    raise exception 'submission not found' using errcode = 'P0002';
  end if;
  if submission_row.submitter_id <> auth.uid() then
    raise exception 'only the submitter can dispute a decision' using errcode = '42501';
  end if;
  if submission_row.status <> 'rejected' then
    raise exception 'only rejected submissions can be disputed' using errcode = '55000';
  end if;
  if submission_row.resolved_at < now() - interval '7 days' then
    raise exception 'the dispute window has expired' using errcode = '55000';
  end if;

  select * into challenge_row
  from public.challenges
  where id = submission_row.challenge_id;

  update public.submissions
  set status = 'disputed', updated_at = now()
  where id = submission_row.id
  returning * into result;

  insert into public.submission_status_history(
    submission_id, from_status, to_status, actor_id, reason
  ) values (
    submission_row.id, submission_row.status, 'disputed', auth.uid(), trim(p_reason)
  );

  insert into public.audit_events(
    actor_id, action, entity_type, entity_id, group_id, details
  ) values (
    auth.uid(), 'submission.disputed', 'submission', submission_row.id,
    challenge_row.group_id, jsonb_build_object('reason', trim(p_reason))
  );

  insert into public.notifications(user_id, type, title, body, data)
  select gm.user_id, 'review', 'Atividade contestada',
    format('Uma decisão no desafio %s precisa de revisão administrativa.', challenge_row.name),
    jsonb_build_object('submission_id', submission_row.id, 'challenge_id', challenge_row.id)
  from public.group_members gm
  where gm.group_id = challenge_row.group_id
    and gm.status = 'active'
    and gm.role in ('admin', 'owner')
    and gm.user_id <> auth.uid();

  return result;
end
$$;

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
    and (
      (s.status = 'disputed' and public.is_group_admin(c.group_id))
      or
      (s.status = 'pending' and (
        c.review_policy = 'any_other_member'
        or (c.review_policy = 'admins_only' and public.is_group_admin(c.group_id))
        or (c.review_policy = 'selected_reviewers' and exists (
          select 1 from public.challenge_reviewers cr
          where cr.challenge_id = c.id and cr.user_id = auth.uid()
        ))
      ))
    )
  order by case when s.status = 'disputed' then 0 else 1 end, s.submitted_at;
$$;

create or replace function public.review_submission(
  p_submission_id uuid,
  p_decision public.review_decision,
  p_points integer,
  p_reason text
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  s public.submissions%rowtype;
  c public.challenges%rowtype;
  result public.submissions%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'review reason is required' using errcode = '22023'; end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'review decision must approve or reject' using errcode = '22023';
  end if;
  if (p_decision = 'approved' and (p_points is null or p_points < 1 or p_points > 100000))
     or (p_decision <> 'approved' and p_points is not null) then
    raise exception 'approved reviews require valid points; other decisions must not award points' using errcode = '22023';
  end if;

  select * into s from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'submission not found' using errcode = 'P0002'; end if;
  if s.status not in ('pending', 'disputed') then raise exception 'submission is not reviewable' using errcode = '55000'; end if;
  if s.submitter_id = auth.uid() then raise exception 'self-review is forbidden' using errcode = '42501'; end if;

  select * into c from public.challenges where id = s.challenge_id;
  if not public.is_challenge_member(c.id) then
    raise exception 'reviewer is not an active challenge member' using errcode = '42501';
  end if;
  if s.status = 'disputed' and not public.is_group_admin(c.group_id) then
    raise exception 'disputes require a group administrator' using errcode = '42501';
  elsif s.status = 'pending' and (
    (c.review_policy = 'admins_only' and not public.is_group_admin(c.group_id))
    or (c.review_policy = 'selected_reviewers' and not exists (
      select 1 from public.challenge_reviewers cr
      where cr.challenge_id = c.id and cr.user_id = auth.uid()
    ))
  ) then
    raise exception 'reviewer is not authorized by challenge policy' using errcode = '42501';
  end if;

  insert into public.reviews(submission_id, reviewer_id, decision, points, reason)
  values (s.id, auth.uid(), p_decision, p_points, trim(p_reason));

  update public.submissions
  set status = p_decision::text::public.submission_status,
      resolved_at = now(), updated_at = now()
  where id = s.id
  returning * into result;

  insert into public.submission_status_history(submission_id, from_status, to_status, actor_id, reason)
  values (s.id, s.status, result.status, auth.uid(), trim(p_reason));

  if p_decision = 'approved' then
    insert into public.point_transactions(challenge_id, user_id, submission_id, kind, points, created_by)
    values (s.challenge_id, s.submitter_id, s.id, 'award', p_points, auth.uid());
  end if;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (auth.uid(), 'submission.reviewed', 'submission', s.id, c.group_id,
          jsonb_build_object('decision', p_decision, 'points', p_points, 'reason', trim(p_reason), 'previous_status', s.status));
  return result;
end
$$;

revoke all on function public.dispute_submission(uuid, text) from public, anon;
grant execute on function public.dispute_submission(uuid, text) to authenticated;

commit;
