begin;

create or replace function public.create_group(p_name text, p_description text, p_timezone text)
returns public.groups language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare created_group public.groups%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'group name must contain between 2 and 100 characters' using errcode='22023'; end if;
  if char_length(trim(coalesce(p_description,''))) not between 3 and 1000 then raise exception 'group description must contain between 3 and 1000 characters' using errcode='22023'; end if;
  if nullif(trim(p_timezone),'') is null then raise exception 'group timezone is required' using errcode='22023'; end if;
  insert into public.groups(name,description,timezone,created_by)
  values(trim(p_name),trim(p_description),trim(p_timezone),auth.uid()) returning * into created_group;
  insert into public.group_members(group_id,user_id,role,status) values(created_group.id,auth.uid(),'owner','active');
  insert into public.audit_events(actor_id,action,entity_type,entity_id,group_id,details)
  values(auth.uid(),'group.created','group',created_group.id,created_group.id,
    jsonb_build_object('name',created_group.name,'description',created_group.description,'timezone',created_group.timezone));
  return created_group;
end $$;

create function public.update_group_settings(p_group_id uuid,p_name text,p_description text,p_timezone text)
returns public.groups language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare previous public.groups%rowtype; changed public.groups%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if not public.is_group_admin(p_group_id) then raise exception 'group admin required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'group name must contain between 2 and 100 characters' using errcode='22023'; end if;
  if char_length(trim(coalesce(p_description,''))) not between 3 and 1000 then raise exception 'group description must contain between 3 and 1000 characters' using errcode='22023'; end if;
  if nullif(trim(p_timezone),'') is null then raise exception 'group timezone is required' using errcode='22023'; end if;
  select * into previous from public.groups where id=p_group_id for update;
  if not found then raise exception 'group not found' using errcode='P0002'; end if;
  update public.groups set name=trim(p_name),description=trim(p_description),timezone=trim(p_timezone),updated_at=now()
    where id=p_group_id returning * into changed;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,group_id,details)
  values(auth.uid(),'group.settings_updated','group',p_group_id,p_group_id,
    jsonb_build_object('previous',jsonb_build_object('name',previous.name,'description',previous.description,'timezone',previous.timezone),
      'current',jsonb_build_object('name',changed.name,'description',changed.description,'timezone',changed.timezone)));
  return changed;
end $$;

create function public.leave_group(p_group_id uuid,p_successor_id uuid default null)
returns public.group_members language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare caller public.group_members%rowtype; successor public.group_members%rowtype; result public.group_members%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  -- Lock the group and every active membership so transfer and concurrent exits are serialized.
  perform 1 from public.groups where id=p_group_id for update;
  if not found then raise exception 'group not found' using errcode='P0002'; end if;
  perform 1 from public.group_members where group_id=p_group_id and status='active' order by user_id for update;
  select * into caller from public.group_members where group_id=p_group_id and user_id=auth.uid() and status='active';
  if not found then raise exception 'active membership required' using errcode='42501'; end if;
  if caller.role='owner' then
    if p_successor_id is null or p_successor_id=auth.uid() then raise exception 'owner must choose an active successor' using errcode='22023'; end if;
    select * into successor from public.group_members where group_id=p_group_id and user_id=p_successor_id and status='active';
    if not found then raise exception 'successor must be an active group member' using errcode='22023'; end if;
    update public.group_members set role='owner' where group_id=p_group_id and user_id=p_successor_id;
    update public.groups set created_by=p_successor_id,updated_at=now() where id=p_group_id;
  elsif p_successor_id is not null then
    raise exception 'only the owner can transfer ownership' using errcode='22023';
  end if;
  update public.group_members set status='left',left_at=now()
    where group_id=p_group_id and user_id=auth.uid() returning * into result;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,group_id,details)
  values(auth.uid(),'group.member_left','profile',auth.uid(),p_group_id,
    jsonb_build_object('previous_role',caller.role,'successor_id',p_successor_id));
  return result;
end $$;

revoke update on public.groups from anon, authenticated;
revoke all on function public.update_group_settings(uuid,text,text,text),public.leave_group(uuid,uuid) from public,anon;
grant execute on function public.update_group_settings(uuid,text,text,text),public.leave_group(uuid,uuid) to authenticated;

commit;
