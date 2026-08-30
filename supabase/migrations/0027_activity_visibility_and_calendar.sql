begin;

drop policy activity_posts_storage_read_group on storage.objects;
create policy activity_posts_storage_read_group
on storage.objects for select to authenticated
using (
  bucket_id = 'activity-posts'
  and exists (
    select 1 from public.activity_posts ap
    join public.activity_post_groups apg on apg.post_id = ap.id
    where ap.photo_path = storage.objects.name
      and public.is_active_group_member(apg.group_id)
  )
);

create function public.get_my_activity_calendar(p_from date, p_to date)
returns table (
  post_id uuid, group_id uuid, activity_name text, group_name text,
  timezone text, occurred_on date, submitted_at timestamptz,
  resolved_at timestamptz, status text
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select ap.id, g.id, ap.name, g.name, g.timezone,
    (ap.created_at at time zone g.timezone)::date,
    ap.created_at, apg.resolved_at, apg.status
  from public.activity_posts ap
  join public.activity_post_groups apg on apg.post_id = ap.id
  join public.groups g on g.id = apg.group_id
  where ap.author_id = auth.uid()
    and public.is_active_group_member(g.id)
    and (ap.created_at at time zone g.timezone)::date >= p_from
    and (ap.created_at at time zone g.timezone)::date < p_to
  order by ap.created_at desc, g.id;
$$;
revoke all on function public.get_my_activity_calendar(date,date) from public, anon;
grant execute on function public.get_my_activity_calendar(date,date) to authenticated;

commit;
