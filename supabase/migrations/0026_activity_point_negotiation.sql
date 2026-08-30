begin;

create table public.activity_point_proposals (
  id bigint generated always as identity primary key,
  post_id uuid not null,
  group_id uuid not null,
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null check (points between 1 and 100000),
  created_at timestamptz not null default now(),
  foreign key (post_id, group_id) references public.activity_post_groups(post_id, group_id) on delete cascade
);
create index activity_point_proposals_latest_idx
  on public.activity_point_proposals(post_id, group_id, proposer_id, created_at desc);
alter table public.activity_point_proposals enable row level security;
create policy activity_point_proposals_read_member
on public.activity_point_proposals for select to authenticated
using (public.is_active_group_member(group_id));
revoke insert, update, delete on public.activity_point_proposals from anon, authenticated;

drop function public.get_group_feed(uuid);
create function public.get_group_feed(p_group_id uuid)
returns table(
  post_id uuid, author_id uuid, author_name text, author_avatar_url text,
  activity_name text, suggested_points integer, current_points integer,
  photo_path text, status text, approvals bigint, rejections bigint,
  required_votes integer, matching_proposals bigint, has_voted boolean,
  proposals jsonb, created_at timestamptz
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with latest_proposals as (
    select distinct on (app.post_id, app.group_id, app.proposer_id)
      app.post_id, app.group_id, app.proposer_id, app.points, app.created_at
    from public.activity_point_proposals app
    order by app.post_id, app.group_id, app.proposer_id, app.created_at desc
  )
  select ap.id, ap.author_id, p.display_name, p.avatar_url, ap.name,
    ap.suggested_points,
    coalesce(author_proposal.points, ap.suggested_points),
    ap.photo_path, apg.status,
    count(distinct apv.voter_id) filter (where apv.decision = 'approved'),
    count(distinct apv.voter_id) filter (where apv.decision = 'rejected'),
    floor((select count(*) from public.group_members gm where gm.group_id = p_group_id and gm.status = 'active' and gm.user_id <> ap.author_id) / 2.0)::integer + 1,
    count(distinct lp.proposer_id) filter (
      where lp.proposer_id <> ap.author_id
        and lp.points = coalesce(author_proposal.points, ap.suggested_points)
    ),
    exists (select 1 from public.activity_post_votes mine where mine.post_id = ap.id and mine.group_id = p_group_id and mine.voter_id = auth.uid()),
    coalesce(jsonb_agg(distinct jsonb_build_object(
      'user_id', lp.proposer_id, 'display_name', proposal_profile.display_name,
      'points', lp.points, 'is_author', lp.proposer_id = ap.author_id,
      'created_at', lp.created_at
    )) filter (where lp.proposer_id is not null), '[]'::jsonb),
    ap.created_at
  from public.activity_post_groups apg
  join public.activity_posts ap on ap.id = apg.post_id
  join public.profiles p on p.id = ap.author_id
  left join latest_proposals author_proposal on author_proposal.post_id = ap.id and author_proposal.group_id = apg.group_id and author_proposal.proposer_id = ap.author_id
  left join latest_proposals lp on lp.post_id = ap.id and lp.group_id = apg.group_id
  left join public.profiles proposal_profile on proposal_profile.id = lp.proposer_id
  left join public.activity_post_votes apv on apv.post_id = ap.id and apv.group_id = apg.group_id
  where apg.group_id = p_group_id and public.is_active_group_member(p_group_id)
  group by ap.id, p.display_name, p.avatar_url, apg.status, author_proposal.points
  order by ap.created_at desc;
$$;

create function public.propose_activity_points(p_post_id uuid, p_group_id uuid, p_points integer)
returns text
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.activity_post_groups%rowtype; author uuid; initial_points integer; agreed_points integer; eligible integer; needed integer; supporters integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_points not between 1 and 100000 then raise exception 'invalid points proposal' using errcode = '22023'; end if;
  if not public.is_active_group_member(p_group_id) then raise exception 'active group membership required' using errcode = '42501'; end if;
  select apg.* into target from public.activity_post_groups apg where apg.post_id=p_post_id and apg.group_id=p_group_id for update;
  if not found or target.status <> 'pending' then raise exception 'post is not open for negotiation' using errcode = '55000'; end if;
  select ap.author_id, ap.suggested_points into author, initial_points from public.activity_posts ap where ap.id=p_post_id;

  insert into public.activity_point_proposals(post_id,group_id,proposer_id,points)
  values(p_post_id,p_group_id,auth.uid(),p_points);

  select coalesce((select app.points from public.activity_point_proposals app where app.post_id=p_post_id and app.group_id=p_group_id and app.proposer_id=author order by app.created_at desc limit 1), initial_points)
  into agreed_points;
  select count(*) into eligible from public.group_members gm where gm.group_id=p_group_id and gm.status='active' and gm.user_id<>author;
  needed := floor(eligible / 2.0)::integer + 1;
  with latest as (
    select distinct on (app.proposer_id) app.proposer_id, app.points
    from public.activity_point_proposals app
    where app.post_id=p_post_id and app.group_id=p_group_id
    order by app.proposer_id, app.created_at desc
  )
  select count(*) into supporters from latest where proposer_id<>author and points=agreed_points;

  if supporters >= needed then
    update public.activity_post_groups set status='approved',resolved_at=now() where post_id=p_post_id and group_id=p_group_id;
    insert into public.group_point_transactions(group_id,user_id,post_id,points) values(p_group_id,author,p_post_id,agreed_points) on conflict do nothing;
    insert into public.notifications(user_id,type,title,body,data)
    values(author,'points','Acordo de pontuação',format('O grupo chegou ao acordo de %s pontos.',agreed_points),jsonb_build_object('post_id',p_post_id,'group_id',p_group_id,'points',agreed_points));
    return 'approved';
  end if;
  return 'pending';
end $$;

revoke all on function public.get_group_feed(uuid), public.propose_activity_points(uuid,uuid,integer) from public, anon;
grant execute on function public.get_group_feed(uuid), public.propose_activity_points(uuid,uuid,integer) to authenticated;

commit;
