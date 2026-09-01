begin;
select plan(1);

create temporary table weekly_fixture as select
  extensions.gen_random_uuid() author_id,
  extensions.gen_random_uuid() member_id;
alter table weekly_fixture add column group_id uuid;
alter table weekly_fixture add column post_id uuid;
grant select, update on weekly_fixture to authenticated;
update weekly_fixture set post_id=extensions.gen_random_uuid();

insert into auth.users(id,email,raw_user_meta_data)
select id,id::text||'@example.test','{"display_name":"Weekly summary"}'::jsonb
from weekly_fixture f cross join lateral unnest(array[f.author_id,f.member_id]) id;
select set_config('request.jwt.claim.sub',author_id::text,true) from weekly_fixture;
update weekly_fixture set group_id=(public.create_group('Weekly group','Summary group','UTC')).id;
insert into public.group_members(group_id,user_id,role,status)
select group_id,member_id,'member','active' from weekly_fixture;
insert into public.activity_posts(id,author_id,name,suggested_points,photo_path,created_at)
select post_id,author_id,'Weekly walk',12,author_id::text||'/weekly.jpg',now() from weekly_fixture;
insert into public.activity_post_groups(post_id,group_id,status,resolved_at)
select post_id,group_id,'approved',now() from weekly_fixture;
insert into public.group_point_transactions(group_id,user_id,post_id,points)
select group_id,author_id,post_id,12 from weekly_fixture;
insert into public.activity_posts(id,author_id,name,suggested_points,photo_path,created_at)
select extensions.gen_random_uuid(),f.author_id,'Previous walk '||day_offset,5,
  f.author_id::text||'/weekly-'||day_offset||'.jpg',now()-(day_offset||' days')::interval
from weekly_fixture f cross join generate_series(1,2) day_offset;
insert into public.activity_post_groups(post_id,group_id,status,resolved_at)
select ap.id,f.group_id,'approved',now()
from weekly_fixture f join public.activity_posts ap on ap.author_id=f.author_id
where ap.photo_path like '%/weekly-%';

create function pg_temp.check_weekly(condition boolean,label text) returns void language plpgsql
as $$ begin if condition is not true then raise exception 'Regression failed: %',label; end if; end $$;

set local role authenticated;
do $$ declare f record; summary record; begin
  select * into f from weekly_fixture;
  perform set_config('request.jwt.claim.sub',f.author_id::text,true);
  select * into summary from public.get_my_weekly_consistency() where group_id=f.group_id;
  perform pg_temp.check_weekly(summary.active_days>=1,'current week includes approved activity');
  perform pg_temp.check_weekly(summary.approved_activities>=1,'approved activities are counted');
  perform pg_temp.check_weekly(summary.net_points=12,'points come from ledger');
  perform pg_temp.check_weekly(summary.current_streak=3,'consecutive civil days form a streak');
  perform pg_temp.check_weekly(summary.week_end=summary.week_start+6,'civil week has seven days');
end $$;
reset role;

select pass('weekly consistency uses approved activity and ledger data');
select * from finish();
rollback;
