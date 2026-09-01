begin;

create function public.create_activity_post_for_groups(
  p_name text,p_suggested_points integer,p_photo_path text,p_group_ids uuid[]
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, storage
as $$
declare post_id uuid; targets uuid[]; target_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'activity name must contain between 2 and 100 characters' using errcode='22023'; end if;
  if p_suggested_points is null or p_suggested_points not between 1 and 100000 then raise exception 'invalid suggested points' using errcode='22023'; end if;
  select coalesce(array_agg(distinct requested_id order by requested_id),'{}'::uuid[])
    into targets from unnest(coalesce(p_group_ids,'{}'::uuid[])) requested_id where requested_id is not null;
  target_count:=cardinality(targets);
  if target_count=0 then raise exception 'select at least one group' using errcode='22023'; end if;
  if exists(select 1 from unnest(targets) requested_id where not public.is_active_group_member(requested_id)) then
    raise exception 'every destination must be an active group membership' using errcode='42501';
  end if;
  perform 1 from public.group_members gm where gm.user_id=auth.uid() and gm.group_id=any(targets) and gm.status='active' order by gm.group_id for share;
  if not exists(select 1 from storage.objects o where o.bucket_id='activity-posts' and o.name=p_photo_path
    and (storage.foldername(o.name))[1]=auth.uid()::text) then raise exception 'activity photo is required' using errcode='23514'; end if;
  insert into public.activity_posts(author_id,name,suggested_points,photo_path)
    values(auth.uid(),trim(p_name),p_suggested_points,p_photo_path) returning id into post_id;
  insert into public.activity_post_groups(post_id,group_id) select post_id,unnest(targets);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),'activity_post.created','activity_post',post_id,
      jsonb_build_object('group_count',target_count,'group_ids',to_jsonb(targets),'suggested_points',p_suggested_points));
  return post_id;
end $$;

create or replace function public.create_activity_post(p_name text,p_suggested_points integer,p_photo_path text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare targets uuid[];
begin
  select coalesce(array_agg(gm.group_id order by gm.group_id),'{}'::uuid[]) into targets
  from public.group_members gm where gm.user_id=auth.uid() and gm.status='active';
  return public.create_activity_post_for_groups(p_name,p_suggested_points,p_photo_path,targets);
end $$;

revoke all on function public.create_activity_post_for_groups(text,integer,text,uuid[]) from public,anon;
grant execute on function public.create_activity_post_for_groups(text,integer,text,uuid[]) to authenticated;

commit;
