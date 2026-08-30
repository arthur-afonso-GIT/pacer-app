begin;

create or replace function public.sync_challenge_members_on_challenge()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.challenge_members(challenge_id, user_id, status)
  select new.id, gm.user_id, 'active'
  from public.group_members gm
  where gm.group_id = new.group_id and gm.status = 'active'
  on conflict (challenge_id, user_id) do update
  set status = 'active', joined_at = now();
  return new;
end
$$;

create or replace function public.sync_challenges_on_group_member()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'active' then
    insert into public.challenge_members(challenge_id, user_id, status)
    select c.id, new.user_id, 'active'
    from public.challenges c
    where c.group_id = new.group_id and c.status in ('draft', 'active')
    on conflict (challenge_id, user_id) do update
    set status = 'active', joined_at = now();
  elsif tg_op = 'UPDATE' and old.status = 'active' and new.status in ('left', 'removed') then
    update public.challenge_members cm
    set status = 'removed'
    from public.challenges c
    where c.id = cm.challenge_id
      and c.group_id = new.group_id
      and cm.user_id = new.user_id;
  end if;
  return new;
end
$$;

-- Group creation is now exclusively handled by create_group(), which inserts
-- both rows atomically. Keeping the legacy trigger would insert the owner twice.
drop trigger if exists on_group_created on public.groups;
drop function if exists public.handle_new_group();
revoke insert on public.groups from anon, authenticated;

commit;
