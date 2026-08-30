begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('activity-posts', 'activity-posts', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.activity_posts (
  id uuid primary key default extensions.gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  suggested_points integer not null check (suggested_points between 1 and 100000),
  photo_path text not null unique,
  created_at timestamptz not null default now()
);

create table public.activity_post_groups (
  post_id uuid not null references public.activity_posts(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  resolved_at timestamptz,
  primary key (post_id, group_id),
  check ((status = 'pending') = (resolved_at is null))
);

create table public.activity_post_votes (
  post_id uuid not null,
  group_id uuid not null,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  decision text not null check (decision in ('approved','rejected')),
  created_at timestamptz not null default now(),
  primary key (post_id, group_id, voter_id),
  foreign key (post_id, group_id) references public.activity_post_groups(post_id, group_id) on delete cascade
);

create table public.group_point_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.activity_posts(id) on delete cascade,
  points integer not null check (points > 0),
  created_at timestamptz not null default now(),
  unique (group_id, post_id)
);

create policy activity_posts_storage_insert_own
on storage.objects for insert to authenticated
with check (bucket_id = 'activity-posts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy activity_posts_storage_read_group
on storage.objects for select to authenticated
using (
  bucket_id = 'activity-posts'
  and exists (
    select 1 from public.activity_posts ap
    join public.activity_post_groups apg on apg.post_id = ap.id
    where ap.photo_path = name and public.is_active_group_member(apg.group_id)
  )
);
create policy activity_posts_storage_delete_own
on storage.objects for delete to authenticated
using (bucket_id = 'activity-posts' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.activity_posts enable row level security;
alter table public.activity_post_groups enable row level security;
alter table public.activity_post_votes enable row level security;
alter table public.group_point_transactions enable row level security;

create policy activity_posts_read_group on public.activity_posts for select to authenticated
using (exists (select 1 from public.activity_post_groups apg where apg.post_id = id and public.is_active_group_member(apg.group_id)));
create policy activity_post_groups_read_member on public.activity_post_groups for select to authenticated
using (public.is_active_group_member(group_id));
create policy activity_post_votes_read_member on public.activity_post_votes for select to authenticated
using (public.is_active_group_member(group_id));
create policy group_points_read_member on public.group_point_transactions for select to authenticated
using (public.is_active_group_member(group_id));

revoke insert, update, delete on public.activity_posts, public.activity_post_groups,
  public.activity_post_votes, public.group_point_transactions from anon, authenticated;

create function public.create_activity_post(p_name text, p_suggested_points integer, p_photo_path text)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public, storage
as $$
declare post_id uuid; target_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then raise exception 'activity name must contain between 2 and 100 characters' using errcode = '22023'; end if;
  if p_suggested_points not between 1 and 100000 then raise exception 'invalid suggested points' using errcode = '22023'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'activity-posts' and o.name = p_photo_path
      and (storage.foldername(o.name))[1] = auth.uid()::text
  ) then raise exception 'activity photo is required' using errcode = '23514'; end if;

  insert into public.activity_posts(author_id, name, suggested_points, photo_path)
  values (auth.uid(), trim(p_name), p_suggested_points, p_photo_path)
  returning id into post_id;

  insert into public.activity_post_groups(post_id, group_id)
  select post_id, gm.group_id from public.group_members gm
  where gm.user_id = auth.uid() and gm.status = 'active';
  get diagnostics target_count = row_count;
  if target_count = 0 then raise exception 'join a group before posting an activity' using errcode = '55000'; end if;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'activity_post.created', 'activity_post', post_id, jsonb_build_object('group_count', target_count, 'suggested_points', p_suggested_points));
  return post_id;
end $$;

create function public.get_group_feed(p_group_id uuid)
returns table(
  post_id uuid, author_id uuid, author_name text, author_avatar_url text,
  activity_name text, suggested_points integer, photo_path text,
  status text, approvals bigint, rejections bigint, required_votes integer,
  has_voted boolean, created_at timestamptz
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select ap.id, ap.author_id, p.display_name, p.avatar_url, ap.name,
    ap.suggested_points, ap.photo_path, apg.status,
    count(apv.*) filter (where apv.decision = 'approved'),
    count(apv.*) filter (where apv.decision = 'rejected'),
    floor((select count(*) from public.group_members gm where gm.group_id = p_group_id and gm.status = 'active' and gm.user_id <> ap.author_id) / 2.0)::integer + 1,
    exists (select 1 from public.activity_post_votes mine where mine.post_id = ap.id and mine.group_id = p_group_id and mine.voter_id = auth.uid()),
    ap.created_at
  from public.activity_post_groups apg
  join public.activity_posts ap on ap.id = apg.post_id
  join public.profiles p on p.id = ap.author_id
  left join public.activity_post_votes apv on apv.post_id = ap.id and apv.group_id = apg.group_id
  where apg.group_id = p_group_id and public.is_active_group_member(p_group_id)
  group by ap.id, p.display_name, p.avatar_url, apg.status
  order by ap.created_at desc;
$$;

create function public.vote_activity_post(p_post_id uuid, p_group_id uuid, p_decision text)
returns text
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.activity_post_groups%rowtype; author uuid; points integer; eligible integer; needed integer; yes_votes integer; no_votes integer; final_status text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid vote' using errcode = '22023'; end if;
  select apg.* into target from public.activity_post_groups apg where apg.post_id = p_post_id and apg.group_id = p_group_id for update;
  if not found or target.status <> 'pending' then raise exception 'post is not open for voting' using errcode = '55000'; end if;
  select ap.author_id, ap.suggested_points into author, points from public.activity_posts ap where ap.id = p_post_id;
  if author = auth.uid() then raise exception 'self vote is forbidden' using errcode = '42501'; end if;
  if not public.is_active_group_member(p_group_id) then raise exception 'active group membership required' using errcode = '42501'; end if;

  insert into public.activity_post_votes(post_id, group_id, voter_id, decision)
  values (p_post_id, p_group_id, auth.uid(), p_decision);
  select count(*) into eligible from public.group_members gm where gm.group_id = p_group_id and gm.status = 'active' and gm.user_id <> author;
  needed := floor(eligible / 2.0)::integer + 1;
  select count(*) filter(where decision='approved'), count(*) filter(where decision='rejected')
  into yes_votes, no_votes from public.activity_post_votes where post_id=p_post_id and group_id=p_group_id;
  if yes_votes >= needed then final_status := 'approved'; elsif no_votes >= needed then final_status := 'rejected'; else return 'pending'; end if;

  update public.activity_post_groups set status=final_status, resolved_at=now() where post_id=p_post_id and group_id=p_group_id;
  if final_status='approved' then
    insert into public.group_point_transactions(group_id,user_id,post_id,points) values(p_group_id,author,p_post_id,points) on conflict do nothing;
  end if;
  insert into public.notifications(user_id,type,title,body,data)
  values(author, case when final_status='approved' then 'points'::public.notification_type else 'review'::public.notification_type end,
    case when final_status='approved' then 'Post validado' else 'Post não validado' end,
    case when final_status='approved' then format('Seu post recebeu %s pontos neste grupo.',points) else 'A maioria não validou este post.' end,
    jsonb_build_object('post_id',p_post_id,'group_id',p_group_id));
  return final_status;
end $$;

revoke all on function public.create_activity_post(text,integer,text), public.get_group_feed(uuid), public.vote_activity_post(uuid,uuid,text) from public, anon;
grant execute on function public.create_activity_post(text,integer,text), public.get_group_feed(uuid), public.vote_activity_post(uuid,uuid,text) to authenticated;

commit;
