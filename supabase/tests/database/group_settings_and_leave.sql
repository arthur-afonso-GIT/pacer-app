begin;
create temporary table leave_fixture as select
  extensions.gen_random_uuid() owner_id, extensions.gen_random_uuid() admin_id,
  extensions.gen_random_uuid() member_id, extensions.gen_random_uuid() outsider_id;
alter table leave_fixture add column group_id uuid;
alter table leave_fixture add column challenge_id uuid;
grant select on leave_fixture to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
select id,id::text||'@example.test','{"display_name":"Group regression"}'::jsonb
from leave_fixture f cross join lateral unnest(array[f.owner_id,f.admin_id,f.member_id,f.outsider_id]) id;
select set_config('request.jwt.claim.sub',owner_id::text,true) from leave_fixture;
update leave_fixture set group_id=(public.create_group('Regression group','Description required for this group','UTC')).id;
insert into public.group_members(group_id,user_id,role,status)
select group_id,admin_id,'admin'::public.group_role,'active'::public.membership_status from leave_fixture
union all select group_id,member_id,'member'::public.group_role,'active'::public.membership_status from leave_fixture;
insert into public.challenges(group_id,created_by,name,description,starts_at,ends_at)
select group_id,owner_id,'Leave sync','Challenge membership synchronization',now(),now()+interval '7 days' from leave_fixture returning id;
update leave_fixture f set challenge_id=(select c.id from public.challenges c where c.group_id=f.group_id and c.name='Leave sync');
create function pg_temp.check_group(condition boolean,label text) returns void language plpgsql
as $$ begin if condition is not true then raise exception 'Regression failed: %',label; end if; end $$;
set local role authenticated;
do $$ declare f record; changed public.groups; begin
  select * into f from leave_fixture;
  perform pg_temp.check_group(f.challenge_id is not null and (select status='active' from public.challenge_members where challenge_id=f.challenge_id and user_id=f.member_id),'challenge membership fixture active');
  perform set_config('request.jwt.claim.sub',f.member_id::text,true);
  begin perform public.update_group_settings(f.group_id,'Hacked','Not allowed','UTC'); raise exception 'member update unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  perform pg_temp.check_group((public.leave_group(f.group_id)).status='left','member can leave');
  perform set_config('request.jwt.claim.sub',f.owner_id::text,true);
  perform pg_temp.check_group((select status<>'active' from public.challenge_members where challenge_id=f.challenge_id and user_id=f.member_id),'challenge membership deactivated');
  perform set_config('request.jwt.claim.sub',f.member_id::text,true);
  begin perform public.leave_group(f.group_id); raise exception 'second exit unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',f.admin_id::text,true);
  changed:=public.update_group_settings(f.group_id,'Updated group','Updated group description','America/Fortaleza');
  perform pg_temp.check_group(changed.description='Updated group description' and changed.timezone='America/Fortaleza','admin updates settings');
  perform set_config('request.jwt.claim.sub',f.owner_id::text,true);
  begin perform public.leave_group(f.group_id); raise exception 'owner exit without successor unexpectedly allowed';
  exception when invalid_parameter_value then null; end;
  perform pg_temp.check_group((public.leave_group(f.group_id,f.admin_id)).status='left','owner transfers and leaves');
  perform set_config('request.jwt.claim.sub',f.admin_id::text,true);
  perform pg_temp.check_group((select role='owner' from public.group_members where group_id=f.group_id and user_id=f.admin_id),'successor becomes owner');
  perform pg_temp.check_group((select created_by=f.admin_id from public.groups where id=f.group_id),'group ownership metadata transferred');
  perform pg_temp.check_group((public.update_group_settings(f.group_id,'New owner group','Still has a description','UTC')).name='New owner group','new owner manages group');
  perform set_config('request.jwt.claim.sub',f.outsider_id::text,true);
  begin perform public.leave_group(f.group_id,f.admin_id); raise exception 'outsider exit unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare f record; begin
  select * into f from leave_fixture;
  perform pg_temp.check_group((select count(*)=2 from public.audit_events where group_id=f.group_id and action='group.member_left'),'exits audited');
  perform pg_temp.check_group((select count(*)=2 from public.audit_events where group_id=f.group_id and action='group.settings_updated'),'updates audited');
end $$;
select 'Group settings and leave regression passed; all fixtures rolled back' result;
rollback;
