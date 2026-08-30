begin;

-- All activity mutations lock the post before its group, serializing deletion
-- with votes/negotiation and preventing points from surviving a deleted post.
create function public.resolve_activity_post(p_post_id uuid, p_group_id uuid)
returns text language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare author uuid; agreed integer; needed integer; supporters integer; opponents integer; outcome text;
begin
  select ap.author_id, coalesce((select app.points from public.activity_point_proposals app
    where app.post_id=ap.id and app.group_id=p_group_id and app.proposer_id=ap.author_id
    order by app.created_at desc, app.id desc limit 1), ap.suggested_points)
    into author, agreed from public.activity_posts ap where ap.id=p_post_id;
  select floor(count(*) / 2.0)::integer + 1 into needed from public.group_members gm
    where gm.group_id=p_group_id and gm.status='active' and gm.user_id<>author;
  with latest as (
    select distinct on (app.proposer_id) app.proposer_id, app.points
    from public.activity_point_proposals app
    where app.post_id=p_post_id and app.group_id=p_group_id
    order by app.proposer_id, app.created_at desc, app.id desc
  )
  select count(*) into supporters from latest lp
    join public.group_members gm on gm.group_id=p_group_id and gm.user_id=lp.proposer_id and gm.status='active'
    where lp.proposer_id<>author and lp.points=agreed
      and not exists (select 1 from public.activity_post_votes v where v.post_id=p_post_id
        and v.group_id=p_group_id and v.voter_id=lp.proposer_id and v.decision='rejected');
  select count(*) into opponents from public.activity_post_votes v
    join public.group_members gm on gm.group_id=v.group_id and gm.user_id=v.voter_id and gm.status='active'
    where v.post_id=p_post_id and v.group_id=p_group_id and v.voter_id<>author and v.decision='rejected';
  if opponents >= needed then outcome := 'rejected';
  elsif supporters >= needed then outcome := 'approved';
  else return 'pending'; end if;
  update public.activity_post_groups set status=outcome,resolved_at=now()
    where post_id=p_post_id and group_id=p_group_id and status='pending';
  if not found then raise exception 'post is already resolved' using errcode='55000'; end if;
  if outcome='approved' then
    insert into public.group_point_transactions(group_id,user_id,post_id,points)
    values(p_group_id,author,p_post_id,agreed);
  end if;
  insert into public.notifications(user_id,type,title,body,data)
  values(author,case when outcome='approved' then 'points'::public.notification_type else 'review'::public.notification_type end,
    case when outcome='approved' then 'Acordo de pontuação' else 'Atividade rejeitada' end,
    case when outcome='approved' then format('O grupo chegou ao acordo de %s pontos.',agreed) else 'A maioria dos outros membros rejeitou a atividade neste grupo.' end,
    jsonb_build_object('post_id',p_post_id,'group_id',p_group_id));
  return outcome;
end $$;
revoke all on function public.resolve_activity_post(uuid,uuid) from public, anon, authenticated;

create or replace function public.propose_activity_points(p_post_id uuid, p_group_id uuid, p_points integer)
returns text language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.activity_post_groups%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_points is null or p_points not between 1 and 100000 then raise exception 'invalid points proposal' using errcode='22023'; end if;
  if not public.is_active_group_member(p_group_id) then raise exception 'active group membership required' using errcode='42501'; end if;
  perform 1 from public.activity_posts where id=p_post_id for update;
  if not found then raise exception 'activity not found' using errcode='55000'; end if;
  select * into target from public.activity_post_groups where post_id=p_post_id and group_id=p_group_id for update;
  if not found or target.status<>'pending' then raise exception 'post is not open for negotiation' using errcode='55000'; end if;
  -- A new points proposal replaces this member's rejection, not both at once.
  delete from public.activity_post_votes where post_id=p_post_id and group_id=p_group_id and voter_id=auth.uid();
  insert into public.activity_point_proposals(post_id,group_id,proposer_id,points)
    values(p_post_id,p_group_id,auth.uid(),p_points);
  return public.resolve_activity_post(p_post_id,p_group_id);
end $$;

create or replace function public.vote_activity_post(p_post_id uuid, p_group_id uuid, p_decision text)
returns text language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.activity_post_groups%rowtype; author uuid; agreed integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'invalid vote' using errcode='22023'; end if;
  if not public.is_active_group_member(p_group_id) then raise exception 'active group membership required' using errcode='42501'; end if;
  select ap.author_id, ap.suggested_points into author, agreed from public.activity_posts ap where ap.id=p_post_id for update;
  if not found then raise exception 'activity not found' using errcode='55000'; end if;
  if author=auth.uid() then raise exception 'self vote is forbidden' using errcode='42501'; end if;
  select * into target from public.activity_post_groups where post_id=p_post_id and group_id=p_group_id for update;
  if not found or target.status<>'pending' then raise exception 'post is not open for voting' using errcode='55000'; end if;
  if p_decision='approved' then
    select coalesce((select app.points from public.activity_point_proposals app
      where app.post_id=p_post_id and app.group_id=p_group_id and app.proposer_id=author
      order by app.created_at desc, app.id desc limit 1),agreed) into agreed;
    return public.propose_activity_points(p_post_id,p_group_id,agreed);
  end if;
  insert into public.activity_post_votes(post_id,group_id,voter_id,decision)
    values(p_post_id,p_group_id,auth.uid(),'rejected')
    on conflict(post_id,group_id,voter_id) do update set decision='rejected',created_at=now();
  return public.resolve_activity_post(p_post_id,p_group_id);
end $$;

create or replace function public.get_group_feed(p_group_id uuid)
returns table(
  post_id uuid, author_id uuid, author_name text, author_avatar_url text,
  activity_name text, suggested_points integer, current_points integer,
  photo_path text, status text, approvals bigint, rejections bigint,
  required_votes integer, matching_proposals bigint, has_voted boolean,
  proposals jsonb, created_at timestamptz
)
language sql stable security definer set search_path = pg_catalog, public
as $$
  with latest as (
    select distinct on (app.post_id,app.proposer_id) app.*
    from public.activity_point_proposals app
    where app.group_id=p_group_id
    order by app.post_id,app.proposer_id,app.created_at desc,app.id desc
  ), effective as (
    select lp.* from latest lp
    join public.group_members gm on gm.group_id=lp.group_id and gm.user_id=lp.proposer_id and gm.status='active'
    where not exists (select 1 from public.activity_post_votes v where v.post_id=lp.post_id
      and v.group_id=lp.group_id and v.voter_id=lp.proposer_id and v.decision='rejected')
  )
  select ap.id,ap.author_id,p.display_name,p.avatar_url,ap.name,ap.suggested_points,
    coalesce(author_proposal.points,ap.suggested_points),ap.photo_path,apg.status,
    count(distinct lp.proposer_id) filter(where lp.proposer_id<>ap.author_id and lp.points=coalesce(author_proposal.points,ap.suggested_points)),
    (select count(*) from public.activity_post_votes v join public.group_members gm
      on gm.group_id=v.group_id and gm.user_id=v.voter_id and gm.status='active'
      where v.post_id=ap.id and v.group_id=p_group_id and v.decision='rejected' and v.voter_id<>ap.author_id),
    floor((select count(*) from public.group_members gm where gm.group_id=p_group_id and gm.status='active' and gm.user_id<>ap.author_id)/2.0)::integer+1,
    count(distinct lp.proposer_id) filter(where lp.proposer_id<>ap.author_id and lp.points=coalesce(author_proposal.points,ap.suggested_points)),
    exists(select 1 from public.activity_post_votes v where v.post_id=ap.id and v.group_id=p_group_id and v.voter_id=auth.uid() and v.decision='rejected'),
    coalesce(jsonb_agg(jsonb_build_object('user_id',lp.proposer_id,'display_name',pp.display_name,'points',lp.points,
      'is_author',lp.proposer_id=ap.author_id,'created_at',lp.created_at)) filter(where lp.proposer_id is not null),'[]'::jsonb),ap.created_at
  from public.activity_posts ap
  join public.activity_post_groups apg on apg.post_id=ap.id
  join public.profiles p on p.id=ap.author_id
  left join latest author_proposal on author_proposal.post_id=ap.id and author_proposal.proposer_id=ap.author_id
  left join effective lp on lp.post_id=ap.id
  left join public.profiles pp on pp.id=lp.proposer_id
  where apg.group_id=p_group_id and public.is_active_group_member(p_group_id)
  group by ap.id,p.display_name,p.avatar_url,apg.status,author_proposal.points
  order by ap.created_at desc,ap.id;
$$;

create function public.delete_activity_post(p_post_id uuid)
returns text language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.activity_posts%rowtype; awarded jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into target from public.activity_posts where id=p_post_id for update;
  if not found then raise exception 'activity not found' using errcode='55000'; end if;
  if target.author_id<>auth.uid() then raise exception 'only the author can delete this activity' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('group_id',t.group_id,'points',t.points)),'[]'::jsonb)
    into awarded from public.group_point_transactions t where t.post_id=p_post_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),'activity_post.deleted','activity_post',p_post_id,jsonb_build_object('removed_points',awarded));
  -- FK cascades remove group posts, votes, proposals and their awarded points.
  delete from public.activity_posts where id=p_post_id;
  return target.photo_path;
end $$;
revoke all on function public.delete_activity_post(uuid) from public, anon;
grant execute on function public.delete_activity_post(uuid) to authenticated;

-- Allows the uploader to remove the file through Storage after deleting the post.
create policy activity_posts_storage_read_own on storage.objects for select to authenticated
using(bucket_id='activity-posts' and (storage.foldername(name))[1]=auth.uid()::text);

commit;
