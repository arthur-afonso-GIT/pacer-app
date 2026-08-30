begin;

-- MVP participation rule: active group members participate in current challenges.
-- The separate challenge_members table remains the authorization boundary and can
-- support explicit opt-in in a later product policy without schema redesign.
create function public.sync_challenge_members_on_challenge() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.challenge_members(challenge_id, user_id, status)
  select new.id, gm.user_id, 'active'
  from public.group_members gm
  where gm.group_id = new.group_id and gm.status = 'active'
  on conflict (challenge_id, user_id) do update set status = 'active', left_at = null, joined_at = now();
  return new;
end
$$;

create trigger challenge_seed_active_members
after insert on public.challenges
for each row execute function public.sync_challenge_members_on_challenge();

create function public.sync_challenges_on_group_member() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'active' then
    insert into public.challenge_members(challenge_id, user_id, status)
    select c.id, new.user_id, 'active'
    from public.challenges c
    where c.group_id = new.group_id and c.status in ('draft', 'active')
    on conflict (challenge_id, user_id) do update set status = 'active', left_at = null, joined_at = now();
  elsif tg_op = 'UPDATE' and old.status = 'active' and new.status in ('left', 'removed') then
    update public.challenge_members cm
    set status = 'removed', left_at = now()
    from public.challenges c
    where c.id = cm.challenge_id and c.group_id = new.group_id and cm.user_id = new.user_id;
  end if;
  return new;
end
$$;

create trigger group_member_sync_challenges
after insert or update of status on public.group_members
for each row execute function public.sync_challenges_on_group_member();

commit;
