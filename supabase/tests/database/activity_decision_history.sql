begin;
select plan(1);

do $$
declare
  owner_id uuid := extensions.gen_random_uuid();
  member_id uuid := extensions.gen_random_uuid();
  second_member_id uuid := extensions.gen_random_uuid();
  outsider_id uuid := extensions.gen_random_uuid();
  group_id uuid := extensions.gen_random_uuid();
  post_id uuid := extensions.gen_random_uuid();
  visible_count integer;
begin
  insert into auth.users(id, email) values
    (owner_id, 'history-owner@example.test'),
    (member_id, 'history-member@example.test'),
    (second_member_id, 'history-second-member@example.test'),
    (outsider_id, 'history-outsider@example.test');
  update public.profiles set display_name = case id
    when owner_id then 'Autora'
    when member_id then 'Membro'
    when second_member_id then 'Segundo membro'
    else 'Pessoa externa'
  end where id in (owner_id, member_id, second_member_id, outsider_id);
  insert into public.groups(id, name, description, timezone, created_by)
    values(group_id, 'Auditoria', 'Grupo para testar a linha do tempo.', 'UTC', owner_id);
  insert into public.group_members(group_id, user_id, role, status) values
    (group_id, owner_id, 'owner', 'active'),
    (group_id, member_id, 'member', 'active'),
    (group_id, second_member_id, 'member', 'active');
  insert into public.activity_posts(id, author_id, name, suggested_points, photo_path)
    values(post_id, owner_id, 'Leitura', 15, owner_id || '/history.webp');
  insert into public.activity_post_groups(post_id, group_id) values(post_id, group_id);

  perform set_config('request.jwt.claim.sub', member_id::text, true);
  perform set_config('role', 'authenticated', true);
  perform public.vote_activity_post(post_id, group_id, 'rejected');
  perform public.propose_activity_points(post_id, group_id, 5);
  perform public.vote_activity_post(post_id, group_id, 'rejected');

  select count(*) into visible_count
  from public.get_group_activity_history(group_id)
  where event_type in ('points_proposed', 'rejection_withdrawn', 'rejection_recorded');
  if visible_count <> 4 then
    raise exception 'expected two rejections, proposal and withdrawal events, got %', visible_count;
  end if;

  perform set_config('request.jwt.claim.sub', outsider_id::text, true);
  select count(*) into visible_count from public.get_group_activity_history(group_id);
  if visible_count <> 0 then
    raise exception 'outsider could read group activity history';
  end if;
end $$;

select pass('activity history is append-only and isolated by active group membership');
select * from finish();
rollback;
