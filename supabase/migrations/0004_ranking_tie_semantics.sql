begin;

-- Preserve equal ranks for equal ledger totals; display name only stabilizes presentation order.
create or replace function public.get_challenge_ranking(p_challenge_id uuid, p_period text default 'total')
returns table(user_id uuid, display_name text, avatar_url text, points bigint, rank bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with context as (
    select c.id, c.starts_at, g.timezone,
      case p_period
        when 'day' then date_trunc('day', now() at time zone g.timezone) at time zone g.timezone
        when 'week' then date_trunc('week', now() at time zone g.timezone) at time zone g.timezone
        when 'month' then date_trunc('month', now() at time zone g.timezone) at time zone g.timezone
        when 'total' then c.starts_at
        else null
      end as period_start
    from public.challenges c
    join public.groups g on g.id = c.group_id
    where c.id = p_challenge_id
      and public.is_challenge_member(c.id)
  ), totals as (
    select cm.user_id, coalesce(sum(pt.points), 0)::bigint as points
    from context x
    join public.challenge_members cm on cm.challenge_id = x.id and cm.status = 'active'
    left join public.point_transactions pt
      on pt.challenge_id = x.id
      and pt.user_id = cm.user_id
      and pt.created_at >= x.period_start
    where x.period_start is not null
    group by cm.user_id
  ), ranked as (
    select t.user_id, t.points, dense_rank() over (order by t.points desc) as rank
    from totals t
  )
  select r.user_id, p.display_name, p.avatar_url, r.points, r.rank
  from ranked r
  join public.profiles p on p.id = r.user_id
  order by r.rank, p.display_name;
$$;

commit;
