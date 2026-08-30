begin;

create function public.create_global_habit(
  p_name text,
  p_description text,
  p_points integer,
  p_max_submissions_per_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_habit public.habits%rowtype;
  attached_count integer;
  group_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 100 then
    raise exception 'invalid habit name' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_description), '')) > 500 then
    raise exception 'invalid habit description' using errcode = '22023';
  end if;
  if p_points not between 1 and 10000 or p_max_submissions_per_day not between 1 and 100 then
    raise exception 'invalid habit scoring limits' using errcode = '22023';
  end if;

  insert into public.habits(owner_id, name, description)
  values (auth.uid(), trim(p_name), nullif(trim(p_description), ''))
  returning * into created_habit;

  select count(distinct gm.group_id)::integer into group_count
  from public.group_members gm
  where gm.user_id = auth.uid()
    and gm.status = 'active'
    and gm.role in ('admin', 'owner');

  insert into public.challenge_habits(
    challenge_id,
    habit_id,
    points,
    max_submissions_per_day
  )
  select c.id, created_habit.id, p_points, p_max_submissions_per_day
  from public.challenges c
  join public.group_members gm on gm.group_id = c.group_id
  where gm.user_id = auth.uid()
    and gm.status = 'active'
    and gm.role in ('admin', 'owner')
    and c.status = 'draft'
  on conflict (challenge_id, habit_id) do nothing;
  get diagnostics attached_count = row_count;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'habit.created_globally',
    'habit',
    created_habit.id,
    jsonb_build_object('groups', group_count, 'draft_challenges', attached_count)
  );

  return jsonb_build_object(
    'habit_id', created_habit.id,
    'group_count', group_count,
    'attached_challenge_count', attached_count
  );
end
$$;

revoke all on function public.create_global_habit(text, text, integer, integer) from public, anon;
grant execute on function public.create_global_habit(text, text, integer, integer) to authenticated;

commit;
