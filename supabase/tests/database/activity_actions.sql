-- Standalone regression: supabase db query --linked --file <this file>
-- All fixtures, notifications and audit records are rolled back.
begin;
create temporary table activity_action_fixture as select
  extensions.gen_random_uuid() author_id, extensions.gen_random_uuid() member_a,
  extensions.gen_random_uuid() member_b, extensions.gen_random_uuid() member_c,
  extensions.gen_random_uuid() outsider;
alter table activity_action_fixture add column group_a uuid;
alter table activity_action_fixture add column group_b uuid;
alter table activity_action_fixture add column post_id uuid;
alter table activity_action_fixture add column photo_path text;
grant select on activity_action_fixture to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
select id,id::text||'@example.test','{"display_name":"Activity regression"}'::jsonb
from activity_action_fixture f cross join lateral unnest(array[f.author_id,f.member_a,f.member_b,f.member_c,f.outsider]) id;
select set_config('request.jwt.claim.sub',author_id::text,true) from activity_action_fixture;
update activity_action_fixture set group_a=(public.create_group('Regression A','','UTC')).id;
update activity_action_fixture set group_b=(public.create_group('Regression B','','UTC')).id;
insert into public.group_members(group_id,user_id,role,status)
select gid,uid,'member','active' from activity_action_fixture f
cross join lateral unnest(array[f.group_a,f.group_b]) gid
cross join lateral unnest(array[f.member_a,f.member_b,f.member_c]) uid;
update activity_action_fixture set photo_path=author_id::text||'/activity-actions.jpg';
insert into storage.objects(bucket_id,name,metadata)
select 'activity-posts',photo_path,'{"mimetype":"image/jpeg","size":100}'::jsonb from activity_action_fixture;
update activity_action_fixture set post_id=public.create_activity_post('Regression reading',15,photo_path);

create function pg_temp.check_activity(condition boolean, label text) returns void
language plpgsql as $$ begin if condition is not true then raise exception 'Regression failed: %',label; end if; end $$;
set local role authenticated;
do $$ declare f record; begin
  select * into f from activity_action_fixture;
  perform set_config('request.jwt.claim.sub',f.outsider::text,true);
  begin
    perform public.vote_activity_post(f.post_id,f.group_a,'rejected');
    raise exception 'outsider vote unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.delete_activity_post(f.post_id);
    raise exception 'outsider deletion unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.resolve_activity_post(f.post_id,f.group_a);
    raise exception 'internal resolver unexpectedly exposed';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',f.author_id::text,true);
  begin
    perform public.vote_activity_post(f.post_id,f.group_a,'rejected');
    raise exception 'self rejection unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',f.member_a::text,true);
  begin
    perform public.delete_activity_post(f.post_id);
    raise exception 'member deletion unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  perform pg_temp.check_activity(public.propose_activity_points(f.post_id,f.group_a,15)='pending','one supporter is not majority');
  perform pg_temp.check_activity(public.vote_activity_post(f.post_id,f.group_a,'rejected')='pending','one rejection is not majority');
  perform pg_temp.check_activity(public.vote_activity_post(f.post_id,f.group_a,'rejected')='pending','repeat rejection is idempotent');
  perform pg_temp.check_activity((select matching_proposals=0 and rejections=1 and has_voted from public.get_group_feed(f.group_a) where post_id=f.post_id),'reject removes old support');
  perform set_config('request.jwt.claim.sub',f.member_b::text,true);
  perform pg_temp.check_activity(public.propose_activity_points(f.post_id,f.group_a,15)='pending','rejected proposal not counted');
  perform set_config('request.jwt.claim.sub',f.member_a::text,true);
  perform pg_temp.check_activity(public.propose_activity_points(f.post_id,f.group_a,10)='pending','new proposal replaces rejection');
  perform pg_temp.check_activity((select rejections=0 and not has_voted from public.get_group_feed(f.group_a) where post_id=f.post_id),'rejection cleared in feed');
  perform set_config('request.jwt.claim.sub',f.author_id::text,true);
  perform pg_temp.check_activity(public.propose_activity_points(f.post_id,f.group_a,10)='pending','author counteroffer needs majority');
  perform set_config('request.jwt.claim.sub',f.member_c::text,true);
  perform pg_temp.check_activity(public.vote_activity_post(f.post_id,f.group_a,'approved')='approved','legacy approval respects negotiated points');
  perform pg_temp.check_activity((select points=10 from public.group_point_transactions where post_id=f.post_id and group_id=f.group_a),'awards negotiated points once');
  begin
    perform public.vote_activity_post(f.post_id,f.group_a,'rejected');
    raise exception 'resolved vote unexpectedly allowed';
  exception when object_not_in_prerequisite_state then null; end;
  perform set_config('request.jwt.claim.sub',f.member_a::text,true);
  perform pg_temp.check_activity(public.vote_activity_post(f.post_id,f.group_b,'rejected')='pending','second group independent');
  perform set_config('request.jwt.claim.sub',f.member_b::text,true);
  perform pg_temp.check_activity(public.vote_activity_post(f.post_id,f.group_b,'rejected')='rejected','majority rejection');
  perform pg_temp.check_activity(not exists(select 1 from public.group_point_transactions where post_id=f.post_id and group_id=f.group_b),'rejection awards no points');
  perform set_config('request.jwt.claim.sub',f.author_id::text,true);
  perform pg_temp.check_activity(public.delete_activity_post(f.post_id)=f.photo_path,'author deletes post');
  perform pg_temp.check_activity(not exists(select 1 from public.get_group_feed(f.group_a) where post_id=f.post_id),'deleted from feed A');
  perform pg_temp.check_activity(not exists(select 1 from public.get_group_feed(f.group_b) where post_id=f.post_id),'deleted from feed B');
  perform pg_temp.check_activity(not exists(select 1 from public.get_my_activity_calendar(current_date-2,current_date+2) where post_id=f.post_id),'deleted from calendar');
  perform pg_temp.check_activity(not exists(select 1 from public.group_point_transactions where post_id=f.post_id),'points removed');
  perform pg_temp.check_activity(exists(select 1 from storage.objects where bucket_id='activity-posts' and name=f.photo_path),'owner can access orphan for storage cleanup');
  perform set_config('request.jwt.claim.sub',f.member_a::text,true);
  perform pg_temp.check_activity(not exists(select 1 from storage.objects where bucket_id='activity-posts' and name=f.photo_path),'members cannot newly access deleted photo');
end $$;
reset role;
do $$ declare f record; begin
  select * into f from activity_action_fixture;
  perform pg_temp.check_activity(exists(select 1 from public.audit_events where entity_id=f.post_id and action='activity_post.deleted'),'deletion audited');
  perform pg_temp.check_activity(not exists(select 1 from public.activity_point_proposals where post_id=f.post_id),'proposal cascade');
  perform pg_temp.check_activity(not exists(select 1 from public.activity_post_votes where post_id=f.post_id),'vote cascade');
end $$;
select 'Activity actions regression passed; all fixtures rolled back' as result;
rollback;
