begin;
select plan(1);

create temporary table delete_group_fixture as select
  extensions.gen_random_uuid() owner_id,
  extensions.gen_random_uuid() member_id,
  extensions.gen_random_uuid() group_a,
  extensions.gen_random_uuid() group_b,
  extensions.gen_random_uuid() exclusive_post,
  extensions.gen_random_uuid() shared_post;
grant select on delete_group_fixture to authenticated;

insert into auth.users(id,email,raw_user_meta_data)
select id,id::text||'@example.test','{"display_name":"Delete group"}'::jsonb
from delete_group_fixture f cross join lateral unnest(array[f.owner_id,f.member_id]) id;
insert into public.groups(id,name,description,timezone,created_by)
select group_a,'Disposable','Group to remove','UTC',owner_id from delete_group_fixture
union all
select group_b,'Preserved','Group to keep','UTC',owner_id from delete_group_fixture;
insert into public.group_members(group_id,user_id,role,status)
select group_id,user_id,role::public.group_role,'active'::public.membership_status
from delete_group_fixture f cross join lateral (
  values(f.group_a,f.owner_id,'owner'),(f.group_a,f.member_id,'member'),
    (f.group_b,f.owner_id,'owner'),(f.group_b,f.member_id,'member')
) membership(group_id,user_id,role);
insert into public.activity_posts(id,author_id,name,suggested_points,photo_path)
select exclusive_post,owner_id,'Exclusive activity',10,owner_id::text||'/exclusive.jpg' from delete_group_fixture
union all
select shared_post,owner_id,'Shared activity',10,owner_id::text||'/shared.jpg' from delete_group_fixture;
insert into public.activity_post_groups(post_id,group_id)
select exclusive_post,group_a from delete_group_fixture
union all select shared_post,group_a from delete_group_fixture
union all select shared_post,group_b from delete_group_fixture;

create function pg_temp.check_group_delete(condition boolean,label text) returns void language plpgsql
as $$ begin if condition is not true then raise exception 'Regression failed: %',label; end if; end $$;

set local role authenticated;
do $$ declare f record; paths text[]; begin
  select * into f from delete_group_fixture;
  perform set_config('request.jwt.claim.sub',f.member_id::text,true);
  begin
    perform public.delete_owned_group(f.group_a);
    raise exception 'member unexpectedly deleted group';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',f.owner_id::text,true);
  paths:=public.delete_owned_group(f.group_a);
  perform pg_temp.check_group_delete(not exists(select 1 from public.groups where id=f.group_a),'group is deleted');
  perform pg_temp.check_group_delete(f.owner_id::text||'/exclusive.jpg'=any(paths),'exclusive photo is returned for cleanup');
  perform pg_temp.check_group_delete(not (f.owner_id::text||'/shared.jpg'=any(paths)),'shared photo is preserved');
  perform pg_temp.check_group_delete(not exists(select 1 from public.activity_posts where id=f.exclusive_post),'exclusive post is deleted');
  perform pg_temp.check_group_delete(exists(select 1 from public.activity_post_groups where post_id=f.shared_post and group_id=f.group_b),'shared post remains in other group');
end $$;
reset role;

select pass('only the owner deletes a group while shared posts survive');
select * from finish();
rollback;
