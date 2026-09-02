begin;

-- Audit entries must remain immutable after their related group is removed.
-- Keeping the UUID as a historical reference avoids the ON DELETE SET NULL
-- update that would otherwise conflict with the append-only audit trigger.
alter table public.audit_events drop constraint audit_events_group_id_fkey;

create function public.delete_owned_group(p_group_id uuid)
returns text[]
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  target public.groups%rowtype;
  removable_post_ids uuid[];
  removable_photo_paths text[];
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='28000';
  end if;
  select * into target from public.groups where id=p_group_id for update;
  if not found then raise exception 'group not found' using errcode='P0002'; end if;
  if not exists(
    select 1 from public.group_members gm
    where gm.group_id=p_group_id and gm.user_id=auth.uid()
      and gm.status='active' and gm.role='owner'
  ) then raise exception 'group owner required' using errcode='42501'; end if;

  select array_agg(distinct ap.id),array_agg(distinct ap.photo_path)
  into removable_post_ids,removable_photo_paths
  from public.activity_posts ap
  where ap.challenge_id in (select c.id from public.challenges c where c.group_id=p_group_id)
    or (
      exists(select 1 from public.activity_post_groups own where own.post_id=ap.id and own.group_id=p_group_id)
      and not exists(select 1 from public.activity_post_groups other where other.post_id=ap.id and other.group_id<>p_group_id)
    );

  insert into public.notifications(user_id,type,title,body,data)
  select gm.user_id,'system'::public.notification_type,'Grupo excluído',
    format('O grupo %s foi excluído pelo proprietário.',target.name),
    jsonb_build_object('group_id',p_group_id)
  from public.group_members gm
  where gm.group_id=p_group_id and gm.status='active' and gm.user_id<>auth.uid();

  insert into public.audit_events(actor_id,action,entity_type,entity_id,group_id,details)
  values(auth.uid(),'group.deleted','group',p_group_id,p_group_id,
    jsonb_build_object('name',target.name,'photo_count',coalesce(cardinality(removable_photo_paths),0)));

  delete from public.groups where id=p_group_id;
  delete from public.activity_posts ap
  where ap.id=any(coalesce(removable_post_ids,'{}'::uuid[]))
    and not exists(select 1 from public.activity_post_groups remaining where remaining.post_id=ap.id);
  return coalesce(removable_photo_paths,'{}'::text[]);
end $$;

revoke all on function public.delete_owned_group(uuid) from public,anon;
grant execute on function public.delete_owned_group(uuid) to authenticated;

commit;
