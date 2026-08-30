begin;

create function public.get_my_groups()
returns setof public.groups
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select g.*
  from public.group_members gm
  join public.groups g on g.id = gm.group_id
  where gm.user_id = auth.uid()
    and gm.status = 'active'
  order by g.created_at desc;
$$;

revoke all on function public.get_my_groups() from public, anon;
grant execute on function public.get_my_groups() to authenticated;

-- Harden invite acceptance for concurrent attempts and accounts without email.
create or replace function public.accept_group_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  invitation public.invites%rowtype;
  caller_email extensions.citext;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if nullif(trim(p_token), '') is null then raise exception 'invite token required' using errcode = '22023'; end if;

  select * into invitation
  from public.invites
  where token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
  for update;

  if not found then raise exception 'invite is invalid or expired' using errcode = '22023'; end if;
  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'invite is invalid or expired' using errcode = '22023';
  end if;

  select email::extensions.citext into caller_email from auth.users where id = auth.uid();
  if invitation.invitee_id is not null and invitation.invitee_id <> auth.uid() then
    raise exception 'invite belongs to another user' using errcode = '42501';
  end if;
  if invitation.email is not null and (caller_email is null or invitation.email <> caller_email) then
    raise exception 'invite belongs to another email' using errcode = '42501';
  end if;

  insert into public.group_members(group_id, user_id, role, status, left_at)
  values (invitation.group_id, auth.uid(), invitation.role, 'active', null)
  on conflict (group_id, user_id) do update
  set role = excluded.role, status = 'active', left_at = null, joined_at = now();

  update public.invites
  set status = 'accepted', invitee_id = auth.uid(), accepted_at = now()
  where id = invitation.id;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (auth.uid(), 'invite.accepted', 'invite', invitation.id, invitation.group_id, '{}'::jsonb);
  return invitation.group_id;
end
$$;

commit;
