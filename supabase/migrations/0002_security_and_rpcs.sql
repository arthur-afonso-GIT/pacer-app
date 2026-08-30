begin;

-- Keep policy predicates centralized and SECURITY DEFINER to avoid recursive RLS.
create function public.is_active_group_member(p_group_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$ select exists (select 1 from public.group_members gm where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.status = 'active') $$;

create function public.is_group_admin(p_group_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$ select exists (select 1 from public.group_members gm where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.status = 'active' and gm.role in ('admin','owner')) $$;

create function public.is_challenge_member(p_challenge_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$ select exists (select 1 from public.challenge_members cm where cm.challenge_id = p_challenge_id and cm.user_id = auth.uid() and cm.status = 'active') $$;

revoke all on function public.is_active_group_member(uuid) from public;
revoke all on function public.is_group_admin(uuid) from public;
revoke all on function public.is_challenge_member(uuid) from public;
grant execute on function public.is_active_group_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
grant execute on function public.is_challenge_member(uuid) to authenticated;

-- Defensive immutability applies even to privileged SQL paths. RPCs append instead.
create function public.reject_mutation() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin raise exception '% is append-only', tg_table_name using errcode = '55000'; end $$;

create trigger point_transactions_immutable before update or delete on public.point_transactions
for each row execute function public.reject_mutation();
create trigger reviews_immutable before update or delete on public.reviews
for each row execute function public.reject_mutation();
create trigger submission_status_history_immutable before update or delete on public.submission_status_history
for each row execute function public.reject_mutation();
create trigger audit_events_immutable before update or delete on public.audit_events
for each row execute function public.reject_mutation();

-- A reversal must exactly negate its original and preserve score ownership/challenge.
create function public.validate_point_transaction() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare original public.point_transactions%rowtype;
begin
  if new.kind = 'reversal' then
    select * into original from public.point_transactions where id = new.reverses_transaction_id for key share;
    if not found or original.kind = 'reversal' then raise exception 'invalid transaction to reverse' using errcode = '23514'; end if;
    if new.points <> -original.points or new.user_id <> original.user_id or new.challenge_id <> original.challenge_id
       or new.submission_id is distinct from original.submission_id then
      raise exception 'reversal must exactly negate original transaction' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger point_transactions_validate before insert on public.point_transactions
for each row execute function public.validate_point_transaction();

create function public.validate_review() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if exists (select 1 from public.submissions s where s.id = new.submission_id and s.submitter_id = new.reviewer_id) then
    raise exception 'self-review is forbidden' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger reviews_no_self_review before insert on public.reviews
for each row execute function public.validate_review();

create function public.record_initial_submission_status() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.submission_status_history(submission_id, from_status, to_status, actor_id, reason)
  values (new.id, null, new.status, new.submitter_id, 'submission created');
  return new;
end $$;
create trigger submission_initial_status after insert on public.submissions
for each row execute function public.record_initial_submission_status();

-- New users own a minimal profile. They can update display metadata later.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.profiles(id, display_name, avatar_url)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, new.id::text), '@', 1)), new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Bootstrap the creator as owner in the same transaction as group creation.
create function public.handle_new_group() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.group_members(group_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'active');
  return new;
end $$;
create trigger on_group_created after insert on public.groups
for each row execute function public.handle_new_group();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invites enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.challenge_reviewers enable row level security;
alter table public.habits enable row level security;
alter table public.challenge_habits enable row level security;
alter table public.submissions enable row level security;
alter table public.evidence enable row level security;
alter table public.reviews enable row level security;
alter table public.submission_status_history enable row level security;
alter table public.point_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_read_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy groups_read_member on public.groups for select to authenticated using (public.is_active_group_member(id));
create policy groups_create on public.groups for insert to authenticated with check (created_by = auth.uid());
create policy groups_update_admin on public.groups for update to authenticated using (public.is_group_admin(id)) with check (public.is_group_admin(id));

create policy group_members_read_peer on public.group_members for select to authenticated using (public.is_active_group_member(group_id));
create policy group_members_admin_insert on public.group_members for insert to authenticated with check (public.is_group_admin(group_id));
create policy group_members_admin_update on public.group_members for update to authenticated using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

create policy invites_read_admin_or_invitee on public.invites for select to authenticated using (public.is_group_admin(group_id) or invitee_id = auth.uid());
create policy invites_admin_insert on public.invites for insert to authenticated with check (public.is_group_admin(group_id) and invited_by = auth.uid());
create policy invites_admin_update on public.invites for update to authenticated using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

create policy challenges_read_member on public.challenges for select to authenticated using (public.is_active_group_member(group_id));
create policy challenges_admin_insert on public.challenges for insert to authenticated with check (public.is_group_admin(group_id) and created_by = auth.uid());
create policy challenges_admin_update on public.challenges for update to authenticated using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

create policy challenge_members_read on public.challenge_members for select to authenticated
using (public.is_challenge_member(challenge_id) or exists (select 1 from public.challenges c where c.id = challenge_id and public.is_group_admin(c.group_id)));
create policy challenge_members_admin_insert on public.challenge_members for insert to authenticated
with check (exists (select 1 from public.challenges c where c.id = challenge_id and public.is_group_admin(c.group_id)));
create policy challenge_members_admin_update on public.challenge_members for update to authenticated
using (exists (select 1 from public.challenges c where c.id = challenge_id and public.is_group_admin(c.group_id)))
with check (exists (select 1 from public.challenges c where c.id = challenge_id and public.is_group_admin(c.group_id)));

create policy challenge_reviewers_read on public.challenge_reviewers for select to authenticated using (public.is_challenge_member(challenge_id));
create policy challenge_reviewers_admin_manage on public.challenge_reviewers for all to authenticated
using (exists (select 1 from public.challenges c where c.id = challenge_id and public.is_group_admin(c.group_id)))
with check (exists (select 1 from public.challenges c where c.id = challenge_id and public.is_group_admin(c.group_id)) and assigned_by = auth.uid());

create policy habits_read_owner_or_group on public.habits for select to authenticated using (
 owner_id = auth.uid() or exists (select 1 from public.challenge_habits ch join public.challenges c on c.id = ch.challenge_id where ch.habit_id = habits.id and public.is_active_group_member(c.group_id)));
create policy habits_owner_insert on public.habits for insert to authenticated with check (owner_id = auth.uid());
create policy habits_owner_update on public.habits for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy challenge_habits_read on public.challenge_habits for select to authenticated using (public.is_challenge_member(challenge_id));
create policy challenge_habits_admin_manage on public.challenge_habits for all to authenticated
using (exists (select 1 from public.challenges c where c.id = challenge_id and public.is_group_admin(c.group_id)))
with check (exists (select 1 from public.challenges c where c.id = challenge_id and public.is_group_admin(c.group_id)));

create policy submissions_read_member on public.submissions for select to authenticated using (public.is_challenge_member(challenge_id));
create policy submissions_create_self on public.submissions for insert to authenticated with check (
 submitter_id = auth.uid() and status = 'pending' and public.is_challenge_member(challenge_id)
 and exists (select 1 from public.challenges c where c.id = challenge_id and c.status = 'active' and now() between c.starts_at and c.ends_at));
-- Status transitions are RPC-only; clients may not update/delete submissions directly.

create policy evidence_read_member on public.evidence for select to authenticated using (
 exists (select 1 from public.submissions s where s.id = submission_id and public.is_challenge_member(s.challenge_id)));
create policy evidence_insert_submitter on public.evidence for insert to authenticated with check (
 exists (select 1 from public.submissions s where s.id = submission_id and s.submitter_id = auth.uid() and s.status = 'pending'));
create policy evidence_delete_submitter_pending on public.evidence for delete to authenticated using (
 exists (select 1 from public.submissions s where s.id = submission_id and s.submitter_id = auth.uid() and s.status = 'pending'));

create policy reviews_read_member on public.reviews for select to authenticated using (
 exists (select 1 from public.submissions s where s.id = submission_id and public.is_challenge_member(s.challenge_id)));
create policy status_history_read_member on public.submission_status_history for select to authenticated using (
 exists (select 1 from public.submissions s where s.id = submission_id and public.is_challenge_member(s.challenge_id)));
create policy points_read_member on public.point_transactions for select to authenticated using (public.is_challenge_member(challenge_id));
-- No INSERT/UPDATE/DELETE policy exists for reviews, history, point_transactions, or audit_events.

create policy notifications_read_self on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_self on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy audit_read_admin on public.audit_events for select to authenticated using (group_id is not null and public.is_group_admin(group_id));

revoke insert, update, delete on public.point_transactions, public.reviews, public.submission_status_history, public.audit_events from anon, authenticated;
revoke update, delete on public.submissions from anon, authenticated;

create function public.review_submission(p_submission_id uuid, p_decision public.review_decision, p_points integer, p_reason text)
returns public.submissions language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare s public.submissions%rowtype; c public.challenges%rowtype; result public.submissions%rowtype;
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
  if not public.is_challenge_member(c.id) then raise exception 'reviewer is not an active challenge member' using errcode = '42501'; end if;
  if (c.review_policy = 'admins_only' and not public.is_group_admin(c.group_id))
     or (c.review_policy = 'selected_reviewers' and not exists (select 1 from public.challenge_reviewers cr where cr.challenge_id = c.id and cr.user_id = auth.uid())) then
    raise exception 'reviewer is not authorized by challenge policy' using errcode = '42501';
  end if;
  insert into public.reviews(submission_id, reviewer_id, decision, points, reason) values (s.id, auth.uid(), p_decision, p_points, p_reason);
  update public.submissions set status = p_decision::text::public.submission_status, resolved_at = now(), updated_at = now() where id = s.id returning * into result;
  insert into public.submission_status_history(submission_id, from_status, to_status, actor_id, reason) values (s.id, s.status, result.status, auth.uid(), p_reason);
  if p_decision = 'approved' then
    insert into public.point_transactions(challenge_id, user_id, submission_id, kind, points, created_by)
    values (s.challenge_id, s.submitter_id, s.id, 'award', p_points, auth.uid());
  end if;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (auth.uid(), 'submission.reviewed', 'submission', s.id, c.group_id, jsonb_build_object('decision', p_decision, 'points', p_points, 'reason', p_reason));
  return result;
end $$;

create function public.cancel_submission(p_submission_id uuid, p_reason text default null)
returns public.submissions language plpgsql security definer
set search_path = pg_catalog, public as $$
declare s public.submissions%rowtype; c public.challenges%rowtype; result public.submissions%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select * into s from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'submission not found' using errcode = 'P0002'; end if;
  select * into c from public.challenges where id = s.challenge_id;
  if s.submitter_id <> auth.uid() and not public.is_group_admin(c.group_id) then raise exception 'not authorized to cancel' using errcode = '42501'; end if;
  if s.status <> 'pending' then raise exception 'only pending submissions can be cancelled; reverse approved scores instead' using errcode = '55000'; end if;
  update public.submissions set status = 'cancelled', cancelled_at = now(), updated_at = now() where id = s.id returning * into result;
  insert into public.submission_status_history(submission_id, from_status, to_status, actor_id, reason) values (s.id, s.status, 'cancelled', auth.uid(), p_reason);
  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details) values (auth.uid(), 'submission.cancelled', 'submission', s.id, c.group_id, jsonb_build_object('reason', p_reason));
  return result;
end $$;

create function public.reverse_point_transaction(p_transaction_id uuid, p_reason text)
returns public.point_transactions language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare original public.point_transactions%rowtype; c public.challenges%rowtype; result public.point_transactions%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'reversal reason is required' using errcode = '22023'; end if;
  select * into original from public.point_transactions where id = p_transaction_id for update;
  if not found then raise exception 'transaction not found' using errcode = 'P0002'; end if;
  select * into c from public.challenges where id = original.challenge_id;
  if not public.is_group_admin(c.group_id) then raise exception 'group admin required' using errcode = '42501'; end if;
  if original.kind = 'reversal' or exists (select 1 from public.point_transactions where reverses_transaction_id = original.id) then raise exception 'transaction cannot be reversed' using errcode = '55000'; end if;
  insert into public.point_transactions(challenge_id, user_id, submission_id, kind, points, reverses_transaction_id, reason, created_by)
  values (original.challenge_id, original.user_id, original.submission_id, 'reversal', -original.points, original.id, p_reason, auth.uid()) returning * into result;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (auth.uid(), 'points.reversed', 'point_transaction', result.id, c.group_id, jsonb_build_object('reverses', original.id, 'reason', p_reason));
  return result;
end $$;

revoke all on function public.review_submission(uuid, public.review_decision, integer, text) from public;
revoke all on function public.cancel_submission(uuid, text) from public;
revoke all on function public.reverse_point_transaction(uuid, text) from public;
grant execute on function public.review_submission(uuid, public.review_decision, integer, text) to authenticated;
grant execute on function public.cancel_submission(uuid, text) to authenticated;
grant execute on function public.reverse_point_transaction(uuid, text) to authenticated;

-- Migration-time assertions catch accidental exposure and missing hardening.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.point_transactions'::regclass) then raise exception 'point_transactions RLS must be enabled'; end if;
  if has_table_privilege('authenticated', 'public.point_transactions', 'INSERT') then raise exception 'authenticated must not insert ledger rows directly'; end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.point_transactions'::regclass and tgname = 'point_transactions_immutable') then raise exception 'ledger immutability trigger missing'; end if;
end $$;

commit;
