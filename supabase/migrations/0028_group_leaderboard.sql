begin;

create function public.get_group_leaderboard(p_group_id uuid)
returns table(user_id uuid, display_name text, avatar_url text, points bigint, rank bigint)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with ledger as (
    select pt.user_id, pt.points
    from public.group_point_transactions pt
    where pt.group_id = p_group_id
    union all
    select pt.user_id, pt.points
    from public.point_transactions pt
    join public.challenges c on c.id = pt.challenge_id
    where c.group_id = p_group_id
  ), totals as (
    select gm.user_id, coalesce(sum(l.points), 0)::bigint as points
    from public.group_members gm
    left join ledger l on l.user_id = gm.user_id
    where gm.group_id = p_group_id and gm.status = 'active'
      and public.is_active_group_member(p_group_id)
    group by gm.user_id
  )
  select t.user_id, p.display_name, p.avatar_url, t.points,
    dense_rank() over (order by t.points desc)
  from totals t join public.profiles p on p.id = t.user_id
  order by t.points desc, p.display_name, t.user_id;
$$;

revoke all on function public.get_group_leaderboard(uuid) from public, anon;
grant execute on function public.get_group_leaderboard(uuid) to authenticated;

commit;
