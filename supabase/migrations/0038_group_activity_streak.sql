begin;

drop function public.get_my_weekly_consistency();

create function public.get_my_weekly_consistency()
returns table(
  group_id uuid,
  group_name text,
  timezone text,
  week_start date,
  week_end date,
  active_days integer,
  approved_activities integer,
  net_points bigint,
  current_streak integer
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with my_groups as (
    select g.id, g.name, g.timezone,
      (now() at time zone g.timezone)::date as today,
      date_trunc('week', now() at time zone g.timezone)::date as week_start
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.user_id = auth.uid() and gm.status = 'active'
  ), all_approved_activity_days as (
    select c.group_id, s.occurred_on as activity_date
    from public.submissions s
    join public.challenges c on c.id = s.challenge_id
    join my_groups mg on mg.id = c.group_id
    where s.submitter_id = auth.uid() and s.status = 'approved'
    union all
    select apg.group_id, (ap.created_at at time zone mg.timezone)::date
    from public.activity_post_groups apg
    join public.activity_posts ap on ap.id = apg.post_id
    join my_groups mg on mg.id = apg.group_id
    where ap.author_id = auth.uid() and apg.status = 'approved'
  ), distinct_activity_days as (
    select distinct group_id, activity_date
    from all_approved_activity_days
  ), weekly_activity_totals as (
    select d.group_id, count(*)::integer as active_days
    from distinct_activity_days d
    join my_groups mg on mg.id = d.group_id
    where d.activity_date >= mg.week_start and d.activity_date < mg.week_start + 7
    group by d.group_id
  ), weekly_approved_totals as (
    select a.group_id, count(*)::integer as approved_activities
    from all_approved_activity_days a
    join my_groups mg on mg.id = a.group_id
    where a.activity_date >= mg.week_start and a.activity_date < mg.week_start + 7
    group by a.group_id
  ), streak_days as (
    select d.group_id, d.activity_date,
      max(d.activity_date) over (partition by d.group_id) as last_active_date,
      row_number() over (partition by d.group_id order by d.activity_date desc) as position
    from distinct_activity_days d
  ), streak_totals as (
    select sd.group_id,
      case
        when max(sd.last_active_date) < mg.today - 1 then 0
        else count(*) filter (
          where sd.activity_date = sd.last_active_date - (sd.position::integer - 1)
        )::integer
      end as current_streak
    from streak_days sd
    join my_groups mg on mg.id = sd.group_id
    group by sd.group_id, mg.today
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
    coalesce(wat.active_days, 0), coalesce(wapt.approved_activities, 0),
    coalesce(pt.net_points, 0), coalesce(st.current_streak, 0)
  from my_groups mg
  left join weekly_activity_totals wat on wat.group_id = mg.id
  left join weekly_approved_totals wapt on wapt.group_id = mg.id
  left join point_totals pt on pt.group_id = mg.id
  left join streak_totals st on st.group_id = mg.id
  order by coalesce(st.current_streak, 0) desc,
    coalesce(wat.active_days, 0) desc, mg.name, mg.id;
$$;

revoke all on function public.get_my_weekly_consistency() from public, anon;
grant execute on function public.get_my_weekly_consistency() to authenticated;

commit;
