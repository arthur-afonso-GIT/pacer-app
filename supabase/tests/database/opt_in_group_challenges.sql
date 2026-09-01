begin;
select plan(1);

create temporary table challenge_fixture as select
  extensions.gen_random_uuid() creator_id,
  extensions.gen_random_uuid() member_id,
  extensions.gen_random_uuid() outsider_id;
alter table challenge_fixture add column group_a uuid;
alter table challenge_fixture add column group_b uuid;
alter table challenge_fixture add column challenge_ids uuid[];
alter table challenge_fixture add column photo_path text;
grant select,update on challenge_fixture to authenticated;

insert into auth.users(id,email,raw_user_meta_data)
select id,id::text||'@example.test','{"display_name":"Challenge participant"}'::jsonb
from challenge_fixture f cross join lateral unnest(array[f.creator_id,f.member_id,f.outsider_id]) id;
select set_config('request.jwt.claim.sub',creator_id::text,true) from challenge_fixture;
update challenge_fixture set group_a=(public.create_group('Study A','Study group A','UTC')).id;
update challenge_fixture set group_b=(public.create_group('Study B','Study group B','UTC')).id;
insert into public.group_members(group_id,user_id,role,status)
select group_id,member_id,'member','active'
from challenge_fixture cross join lateral unnest(array[group_a,group_b]) group_id;
update challenge_fixture set photo_path=member_id::text||'/challenge.jpg';
insert into storage.objects(bucket_id,name,metadata)
select 'activity-posts',photo_path,'{"mimetype":"image/jpeg","size":100}'::jsonb from challenge_fixture;

create function pg_temp.check_challenge(condition boolean,label text) returns void language plpgsql
as $$ begin if condition is not true then raise exception 'Regression failed: %',label; end if; end $$;

set local role authenticated;
do $$ declare f record; first_challenge uuid; activity_id uuid; begin
  select * into f from challenge_fixture;
  perform set_config('request.jwt.claim.sub',f.creator_id::text,true);
  update challenge_fixture set challenge_ids=public.create_group_challenge_invites(
    'Study sprint','Read together',now(),now()+interval '14 days',array[f.group_a,f.group_b]
  );
  select * into f from challenge_fixture;
  first_challenge:=f.challenge_ids[1];
  perform pg_temp.check_challenge(cardinality(f.challenge_ids)=2,'one challenge per selected group');
  perform pg_temp.check_challenge((select count(*)=2 from public.challenge_members where user_id=f.creator_id and status='active'),'creator joins both instances');
  perform pg_temp.check_challenge((select count(*)=0 from public.challenge_members where user_id=f.member_id),'group members are not auto-enrolled');

  perform set_config('request.jwt.claim.sub',f.member_id::text,true);
  perform pg_temp.check_challenge((select count(*)=2 from public.get_my_challenge_hub() where not is_participant),'member sees both invitations');
  perform public.join_group_challenge(first_challenge);
  perform pg_temp.check_challenge((select is_participant from public.get_my_challenge_hub() where challenge_id=first_challenge),'member can opt in');
  activity_id:=public.create_challenge_activity_post('Read chapter',15,f.photo_path,first_challenge);
  perform pg_temp.check_challenge((select count(*)=1 from public.get_challenge_activity_feed(first_challenge) where post_id=activity_id),'challenge activity appears in its feed');
  perform set_config('request.jwt.claim.sub',f.creator_id::text,true);
  perform public.vote_activity_post(activity_id,(select group_id from public.challenges where id=first_challenge),'approved');
  perform set_config('request.jwt.claim.sub',f.member_id::text,true);
  perform pg_temp.check_challenge((select points=15 from public.get_challenge_ranking(first_challenge,'total') where user_id=f.member_id),'approved challenge post reaches challenge ranking');

  perform set_config('request.jwt.claim.sub',f.outsider_id::text,true);
  begin
    perform public.join_group_challenge(first_challenge);
    raise exception 'outsider unexpectedly joined';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select pass('multi-group challenges are invitations with explicit opt-in');
select * from finish();
rollback;
