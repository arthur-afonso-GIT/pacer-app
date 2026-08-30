begin;

create function public.create_group(
  p_name text,
  p_description text,
  p_timezone text
)
returns public.groups
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  created_group public.groups%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 100 then
    raise exception 'group name must contain between 2 and 100 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(p_description, '')) > 1000 then
    raise exception 'group description must contain at most 1000 characters' using errcode = '22023';
  end if;
  if nullif(trim(p_timezone), '') is null then
    raise exception 'group timezone is required' using errcode = '22023';
  end if;

  insert into public.groups(name, description, timezone, created_by)
  values (
    trim(p_name), nullif(trim(coalesce(p_description, '')), ''),
    trim(p_timezone), auth.uid()
  )
  returning * into created_group;

  insert into public.group_members(group_id, user_id, role, status)
  values (created_group.id, auth.uid(), 'owner', 'active');

  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (
    auth.uid(), 'group.created', 'group', created_group.id, created_group.id,
    jsonb_build_object('name', created_group.name, 'timezone', created_group.timezone)
  );

  return created_group;
end
$$;

revoke all on function public.create_group(text, text, text) from public, anon;
grant execute on function public.create_group(text, text, text) to authenticated;

commit;
