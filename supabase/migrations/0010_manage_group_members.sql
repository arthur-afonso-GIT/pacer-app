begin;

create function public.manage_group_member(
  p_group_id uuid,
  p_user_id uuid,
  p_action text,
  p_role public.group_role default null
)
returns public.group_members
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.group_members%rowtype;
  result public.group_members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.is_group_admin(p_group_id) then
    raise exception 'group admin required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'use the account leave flow for yourself' using errcode = '42501';
  end if;

  select * into target
  from public.group_members
  where group_id = p_group_id and user_id = p_user_id and status = 'active'
  for update;
  if not found then
    raise exception 'active member not found' using errcode = 'P0002';
  end if;
  if target.role = 'owner' then
    raise exception 'the group owner cannot be changed or removed' using errcode = '42501';
  end if;

  if p_action = 'set_role' then
    if p_role is null or p_role = 'owner' then
      raise exception 'role must be member or admin' using errcode = '22023';
    end if;
    update public.group_members
    set role = p_role
    where group_id = p_group_id and user_id = p_user_id
    returning * into result;
  elsif p_action = 'remove' then
    update public.group_members
    set status = 'removed', left_at = now()
    where group_id = p_group_id and user_id = p_user_id
    returning * into result;
  else
    raise exception 'unknown member action' using errcode = '22023';
  end if;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (
    auth.uid(),
    case when p_action = 'remove' then 'group.member_removed' else 'group.member_role_changed' end,
    'profile',
    p_user_id,
    p_group_id,
    jsonb_build_object('previous_role', target.role, 'new_role', result.role)
  );
  return result;
end
$$;

revoke all on function public.manage_group_member(uuid, uuid, text, public.group_role) from public, anon;
grant execute on function public.manage_group_member(uuid, uuid, text, public.group_role) to authenticated;

-- Membership mutations must pass through guarded security-definer functions.
-- This prevents a client from bypassing owner/self-management invariants with
-- a direct PostgREST update, even if a permissive RLS policy is added later.
revoke update on public.group_members from anon, authenticated;

commit;
