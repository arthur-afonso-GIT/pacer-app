begin;

alter table public.submissions drop constraint if exists submissions_check;
alter table public.submissions drop constraint if exists submissions_check1;

alter table public.submissions
  add constraint submissions_resolution_timestamps check (
    (status = 'pending' and resolved_at is null and cancelled_at is null)
    or (status in ('approved', 'rejected', 'disputed') and resolved_at is not null and cancelled_at is null)
    or (status = 'cancelled' and resolved_at is null and cancelled_at is not null)
  );

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
  if (p_decision = 'approved' and (p_points is null or p_points < 1 or p_points > 100000))
     or (p_decision <> 'approved' and p_points is not null) then
    raise exception 'approved reviews require valid points; other decisions must not award points' using errcode = '22023';
  end if;

  select * into s from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'submission not found' using errcode = 'P0002'; end if;
  if s.status <> 'pending' then raise exception 'submission is not pending' using errcode = '55000'; end if;
  if s.submitter_id = auth.uid() then raise exception 'self-review is forbidden' using errcode = '42501'; end if;

  select * into c from public.challenges where id = s.challenge_id;
  if not public.is_challenge_member(c.id) then
    raise exception 'reviewer is not an active challenge member' using errcode = '42501';
  end if;
  if (c.review_policy = 'admins_only' and not public.is_group_admin(c.group_id))
     or (c.review_policy = 'selected_reviewers' and not exists (
       select 1 from public.challenge_reviewers cr
       where cr.challenge_id = c.id and cr.user_id = auth.uid()
     )) then
    raise exception 'reviewer is not authorized by challenge policy' using errcode = '42501';
  end if;

  insert into public.reviews(submission_id, reviewer_id, decision, points, reason)
  values (s.id, auth.uid(), p_decision, p_points, p_reason);

  update public.submissions
  set status = p_decision::text::public.submission_status,
      resolved_at = case when p_decision in ('approved', 'rejected', 'disputed') then now() else null end,
      cancelled_at = case when p_decision = 'cancelled' then now() else null end,
      updated_at = now()
  where id = s.id
  returning * into result;

  insert into public.submission_status_history(submission_id, from_status, to_status, actor_id, reason)
  values (s.id, s.status, result.status, auth.uid(), p_reason);

  if p_decision = 'approved' then
    insert into public.point_transactions(challenge_id, user_id, submission_id, kind, points, created_by)
    values (s.challenge_id, s.submitter_id, s.id, 'award', p_points, auth.uid());
  end if;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (auth.uid(), 'submission.reviewed', 'submission', s.id, c.group_id,
          jsonb_build_object('decision', p_decision, 'points', p_points, 'reason', p_reason));
  return result;
end
$$;

commit;
