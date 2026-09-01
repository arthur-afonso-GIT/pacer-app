begin;
select plan(7);

create temporary table activity_fixture as select
  extensions.gen_random_uuid() as author_id,
  extensions.gen_random_uuid() as member_id,
  extensions.gen_random_uuid() as outsider_id;
alter table activity_fixture add column group_a uuid;
alter table activity_fixture add column group_b uuid;
alter table activity_fixture add column post_id uuid;
alter table activity_fixture add column photo_path text;
grant select on activity_fixture to authenticated;

insert into auth.users(id,email,raw_user_meta_data)
select author_id, author_id::text || '@example.test', '{"display_name":"Feed author"}'::jsonb from activity_fixture
union all select member_id, member_id::text || '@example.test', '{"display_name":"Feed member"}'::jsonb from activity_fixture
union all select outsider_id, outsider_id::text || '@example.test', '{"display_name":"Feed outsider"}'::jsonb from activity_fixture;

select set_config('request.jwt.claim.sub', author_id::text, true) from activity_fixture;
update activity_fixture set group_a = (public.create_group('Feed A','Primary feed visibility group','America/Fortaleza')).id;
update activity_fixture set group_b = (public.create_group('Feed B','Secondary feed visibility group','Asia/Tokyo')).id;
insert into public.group_members(group_id,user_id,role,status)
select group_a,member_id,'member','active' from activity_fixture;
update activity_fixture set photo_path = author_id::text || '/regression.jpg';
insert into storage.objects(bucket_id,name,metadata)
select 'activity-posts',photo_path,'{"mimetype":"image/jpeg","size":123}'::jsonb from activity_fixture;
update activity_fixture set post_id = public.create_activity_post('Regression activity',15,photo_path);

set local role authenticated;
select is((select count(*) from public.activity_post_groups where post_id=(select post_id from activity_fixture)), 2::bigint, 'post is distributed to both active groups');
select is((select count(*) from public.get_my_activity_calendar(current_date-2,current_date+2)), 2::bigint, 'calendar includes the post once per group');
select is((select count(*) from public.get_group_feed((select group_a from activity_fixture))), 1::bigint, 'author sees the post in the feed');
select set_config('request.jwt.claim.sub', member_id::text, true) from activity_fixture;
select is((select count(*) from storage.objects where bucket_id='activity-posts' and name=(select photo_path from activity_fixture)), 1::bigint, 'another group member can read the photo with a path distinct from the activity title');
select is((select count(*) from public.get_my_activity_calendar(current_date-2,current_date+2)), 0::bigint, 'calendar does not expose another author posts');
select set_config('request.jwt.claim.sub', outsider_id::text, true) from activity_fixture;
select is((select count(*) from storage.objects where bucket_id='activity-posts' and name=(select photo_path from activity_fixture)), 0::bigint, 'outsider cannot read the photo');
select is((select count(*) from public.get_group_feed((select group_a from activity_fixture))), 0::bigint, 'outsider cannot read the feed');
reset role;
select * from finish();
rollback;
