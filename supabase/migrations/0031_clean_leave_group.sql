begin;

create or replace function public.leave_group(p_group_id uuid,p_successor_id uuid default null)
returns public.group_members language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare caller public.group_members%rowtype; result public.group_members%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  perform 1 from public.groups where id=p_group_id for update;
  if not found then raise exception 'group not found' using errcode='P0002'; end if;
  perform 1 from public.group_members where group_id=p_group_id and status='active' order by user_id for update;
  select * into caller from public.group_members where group_id=p_group_id and user_id=auth.uid() and status='active';
  if not found then raise exception 'active membership required' using errcode='42501'; end if;
  if caller.role='owner' then
    if p_successor_id is null or p_successor_id=auth.uid() then raise exception 'owner must choose an active successor' using errcode='22023'; end if;
    perform 1 from public.group_members where group_id=p_group_id and user_id=p_successor_id and status='active';
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

commit;
