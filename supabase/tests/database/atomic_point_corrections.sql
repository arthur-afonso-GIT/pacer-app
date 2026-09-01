begin;
select plan(1);

do $$
declare
  owner_id uuid := extensions.gen_random_uuid();
  member_id uuid := extensions.gen_random_uuid();
  group_id uuid := extensions.gen_random_uuid();
  challenge_id uuid := extensions.gen_random_uuid();
  habit_id uuid := extensions.gen_random_uuid();
  challenge_habit_id uuid := extensions.gen_random_uuid();
  submission_key uuid := extensions.gen_random_uuid();
  award_id uuid := extensions.gen_random_uuid();
  total integer;
begin
  insert into auth.users(id, email) values
    (owner_id, 'correction-owner@example.test'),
    (member_id, 'correction-member@example.test');
  update public.profiles set display_name = case id
    when owner_id then 'Admin'
    else 'Participante'
  end where id in (owner_id, member_id);
  insert into public.groups(id, name, description, timezone, created_by)
    values(group_id, 'Correções', 'Teste de correção atômica.', 'UTC', owner_id);
  insert into public.group_members(group_id, user_id, role, status) values
    (group_id, owner_id, 'owner', 'active'),
    (group_id, member_id, 'member', 'active');
  insert into public.challenges(id, group_id, name, description, starts_at, ends_at, status, created_by)
    values(challenge_id, group_id, 'Pontos', 'Teste', now() - interval '1 day', now() + interval '1 day', 'draft', owner_id);
  insert into public.challenge_members(challenge_id, user_id, status) values
    (challenge_id, owner_id, 'active'), (challenge_id, member_id, 'active')
    on conflict on constraint challenge_members_pkey
    do update set status = 'active';
  insert into public.habits(id, name, description, owner_id)
    values(habit_id, 'Leitura', 'Teste', owner_id);
  insert into public.challenge_habits(id, challenge_id, habit_id, points)
    values(challenge_habit_id, challenge_id, habit_id, 15);
  update public.challenges set status = 'active' where id = challenge_id;
  insert into public.submissions(id, challenge_id, challenge_habit_id, submitter_id, occurred_on, status, resolved_at)
    values(submission_key, challenge_id, challenge_habit_id, member_id, current_date, 'approved', now());
  insert into public.point_transactions(id, challenge_id, user_id, submission_id, kind, points, created_by)
    values(award_id, challenge_id, member_id, submission_key, 'award', 15, owner_id);

  perform set_config('request.jwt.claim.sub', member_id::text, true);
  perform set_config('role', 'authenticated', true);
  begin
    perform public.correct_point_transaction(award_id, 10, 'Tentativa sem permissão');
    raise exception 'member correction should fail';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform public.correct_point_transaction(award_id, 10, 'Valor acordado após revisão');

  select sum(points) into total
  from public.point_transactions
  where submission_id = submission_key;
  if total <> 10 then raise exception 'expected corrected total 10, got %', total; end if;

  begin
    perform public.correct_point_transaction(award_id, 8, 'Segunda correção');
    raise exception 'second correction should fail';
  exception when sqlstate '55000' then null;
  end;
end $$;

select pass('point correction is atomic, authorized and cannot be repeated');
select * from finish();
rollback;
