begin;
select plan(1);
create temporary table destination_fixture as select
  extensions.gen_random_uuid() author_id,extensions.gen_random_uuid() member_id,
  extensions.gen_random_uuid() outsider_id;
alter table destination_fixture add column group_a uuid;
alter table destination_fixture add column group_b uuid;
alter table destination_fixture add column post_id uuid;
alter table destination_fixture add column photo_path text;
grant select,update on destination_fixture to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
select id,id::text||'@example.test','{"display_name":"Destination regression"}'::jsonb
from destination_fixture f cross join lateral unnest(array[f.author_id,f.member_id,f.outsider_id]) id;
select set_config('request.jwt.claim.sub',author_id::text,true) from destination_fixture;
update destination_fixture set group_a=(public.create_group('Destination A','First destination group','UTC')).id;
update destination_fixture set group_b=(public.create_group('Destination B','Second destination group','UTC')).id;
insert into public.group_members(group_id,user_id,role,status)
select group_a,member_id,'member','active' from destination_fixture;
update destination_fixture set photo_path=author_id::text||'/destinations.jpg';
insert into storage.objects(bucket_id,name,metadata)
select 'activity-posts',photo_path,'{"mimetype":"image/jpeg","size":100}'::jsonb from destination_fixture;
create function pg_temp.check_destination(condition boolean,label text) returns void language plpgsql
as $$ begin if condition is not true then raise exception 'Regression failed: %',label; end if; end $$;
set local role authenticated;
do $$ declare f record; begin
  select * into f from destination_fixture;
  perform set_config('request.jwt.claim.sub',f.author_id::text,true);
  begin perform public.create_activity_post_for_groups('No target',10,f.photo_path,'{}'::uuid[]); raise exception 'empty target unexpectedly allowed';
  exception when invalid_parameter_value then null; end;
  begin perform public.create_activity_post_for_groups('Foreign target',10,f.photo_path,array[f.group_a,extensions.gen_random_uuid()]); raise exception 'foreign target unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  update destination_fixture set post_id=public.create_activity_post_for_groups('Selected post',10,f.photo_path,array[f.group_a,f.group_a]);
  select * into f from destination_fixture;
  perform pg_temp.check_destination((select count(*)=1 from public.activity_post_groups where post_id=f.post_id and group_id=f.group_a),'duplicate target deduplicated');
  perform pg_temp.check_destination(not exists(select 1 from public.activity_post_groups where post_id=f.post_id and group_id=f.group_b),'unselected group excluded');
  perform pg_temp.check_destination((select count(*)=1 from public.get_my_activity_calendar(current_date-2,current_date+2) where post_id=f.post_id),'calendar has selected destination once');
  perform set_config('request.jwt.claim.sub',f.member_id::text,true);
  perform pg_temp.check_destination((select count(*)=1 from public.get_group_feed(f.group_a) where post_id=f.post_id),'selected member sees feed');
  perform set_config('request.jwt.claim.sub',f.outsider_id::text,true);
  perform pg_temp.check_destination(not exists(select 1 from public.get_group_feed(f.group_a) where post_id=f.post_id),'outsider sees no feed');
end $$;
reset role;
select pass('selected activity destinations are authorized and deduplicated');
select * from finish();
rollback;
