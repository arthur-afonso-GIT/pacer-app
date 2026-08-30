# Server-side ranking RPC recommendation

The current implementation calls the generated, typed `get_challenge_ranking` RPC, which derives scores only from signed `point_transactions` and computes periods with the group's IANA timezone. The pure client aggregation remains covered for signed-entry and tie behavior, but no profile score is read.

If the RPC must be recreated or hardened, the required shape is below. It performs timezone boundaries and aggregation atomically, includes active members with zero points, and uses competition ranking for ties.

```sql
create function public.get_challenge_ranking(
  p_challenge_id uuid,
  p_period text default 'week',
  p_now timestamptz default now()
)
returns table(user_id uuid, display_name text, avatar_url text, points bigint, rank bigint)
language sql stable security invoker set search_path = pg_catalog, public as $$
  with context as (
    select c.id, c.starts_at, c.ends_at, g.timezone
    from public.challenges c
    join public.groups g on g.id = c.group_id
    where c.id = p_challenge_id
      and public.is_challenge_member(c.id)
  ), bounds as (
    select case p_period
      when 'day' then date_trunc('day', p_now at time zone timezone) at time zone timezone
      when 'week' then date_trunc('week', p_now at time zone timezone) at time zone timezone
      when 'month' then date_trunc('month', p_now at time zone timezone) at time zone timezone
      when 'challenge' then '-infinity'::timestamptz
      else null end as from_at,
    case p_period
      when 'day' then (date_trunc('day', p_now at time zone timezone) + interval '1 day') at time zone timezone
      when 'week' then (date_trunc('week', p_now at time zone timezone) + interval '1 week') at time zone timezone
      when 'month' then (date_trunc('month', p_now at time zone timezone) + interval '1 month') at time zone timezone
      when 'challenge' then 'infinity'::timestamptz
      else null end as to_at
    from context
  ), totals as (
    select cm.user_id, coalesce(sum(pt.points), 0)::bigint as points
    from public.challenge_members cm cross join bounds b
    left join public.point_transactions pt
      on pt.challenge_id = cm.challenge_id and pt.user_id = cm.user_id
      and pt.created_at >= b.from_at and pt.created_at < b.to_at
    where cm.challenge_id = p_challenge_id and cm.status = 'active'
    group by cm.user_id
  )
  select p.id, p.display_name, p.avatar_url, t.points,
         rank() over (order by t.points desc) as rank
  from totals t join public.profiles p on p.id = t.user_id
  order by t.points desc, p.display_name collate "C", p.id;
$$;

revoke all on function public.get_challenge_ranking(uuid, text, timestamptz) from public;
grant execute on function public.get_challenge_ranking(uuid, text, timestamptz) to authenticated;
```

A production migration should also reject invalid `p_period` explicitly and add an index on `point_transactions(challenge_id, created_at, user_id)` after checking query plans.
