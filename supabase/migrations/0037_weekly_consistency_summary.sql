begin;

create function public.get_my_weekly_consistency()
returns table(
  group_id uuid,
  group_name text,
  timezone text,
  week_start date,
  week_end date,
  active_days integer,
  approved_activities integer,
  net_points bigint
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with my_groups as (
    select g.id, g.name, g.timezone,
      date_trunc('week', now() at time zone g.timezone)::date as week_start
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.user_id = auth.uid() and gm.status = 'active'
  ), approved_activity_days as (
    select c.group_id, s.occurred_on as activity_date
    from public.submissions s
    join public.challenges c on c.id = s.challenge_id
    join my_groups mg on mg.id = c.group_id
    where s.submitter_id = auth.uid()
      and s.status = 'approved'
      and s.occurred_on >= mg.week_start
      and s.occurred_on < mg.week_start + 7
    union all
    select apg.group_id, (ap.created_at at time zone mg.timezone)::date
    from public.activity_post_groups apg
    join public.activity_posts ap on ap.id = apg.post_id
    join my_groups mg on mg.id = apg.group_id
    where ap.author_id = auth.uid()
      and apg.status = 'approved'
      and (ap.created_at at time zone mg.timezone)::date >= mg.week_start
      and (ap.created_at at time zone mg.timezone)::date < mg.week_start + 7
  ), activity_totals as (
    select group_id, count(distinct activity_date)::integer as active_days,
      count(*)::integer as approved_activities
    from approved_activity_days
    group by group_id
  ), weekly_ledger as (
    select c.group_id, pt.points
    from public.point_transactions pt
    join public.challenges c on c.id = pt.challenge_id
    join my_groups mg on mg.id = c.group_id
    where pt.user_id = auth.uid()
      and pt.created_at >= (mg.week_start::timestamp at time zone mg.timezone)
      and pt.created_at < ((mg.week_start + 7)::timestamp at time zone mg.timezone)
    union all
    select gpt.group_id, gpt.points
    from public.group_point_transactions gpt
    join my_groups mg on mg.id = gpt.group_id
    where gpt.user_id = auth.uid()
      and gpt.created_at >= (mg.week_start::timestamp at time zone mg.timezone)
      and gpt.created_at < ((mg.week_start + 7)::timestamp at time zone mg.timezone)
  ), point_totals as (
    select group_id, sum(points)::bigint as net_points
    from weekly_ledger
    group by group_id
  )
  select mg.id, mg.name, mg.timezone, mg.week_start, mg.week_start + 6,
    coalesce(at.active_days, 0), coalesce(at.approved_activities, 0),
    coalesce(pt.net_points, 0)
  from my_groups mg
  left join activity_totals at on at.group_id = mg.id
  left join point_totals pt on pt.group_id = mg.id
  order by coalesce(at.active_days, 0) desc, mg.name, mg.id;
$$;

revoke all on function public.get_my_weekly_consistency() from public, anon;
grant execute on function public.get_my_weekly_consistency() to authenticated;

commit;
