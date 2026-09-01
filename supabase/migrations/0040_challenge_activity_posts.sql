begin;

alter table public.activity_posts
  add column challenge_id uuid references public.challenges(id) on delete cascade;
create index activity_posts_challenge_idx on public.activity_posts(challenge_id,created_at desc)
where challenge_id is not null;

create function public.create_challenge_activity_post(
  p_name text,
  p_suggested_points integer,
  p_photo_path text,
  p_challenge_id uuid
)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public, storage
as $$
declare target public.challenges%rowtype; post_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 100 then
    raise exception 'activity name must contain between 2 and 100 characters' using errcode='22023';
  end if;
  if p_suggested_points not between 1 and 100000 then
    raise exception 'invalid suggested points' using errcode='22023';
  end if;
  select * into target from public.challenges where id=p_challenge_id;
  if not found or target.status<>'active' or now()<target.starts_at or now()>=target.ends_at then
    raise exception 'challenge is not accepting activities' using errcode='55000';
  end if;
  if not public.is_challenge_member(p_challenge_id) then
    raise exception 'active challenge membership required' using errcode='42501';
  end if;
  if not exists(
    select 1 from storage.objects o
    where o.bucket_id='activity-posts' and o.name=p_photo_path
      and (storage.foldername(o.name))[1]=auth.uid()::text
  ) then raise exception 'activity photo is required' using errcode='23514'; end if;

  insert into public.activity_posts(author_id,name,suggested_points,photo_path,challenge_id)
  values(auth.uid(),trim(p_name),p_suggested_points,p_photo_path,p_challenge_id)
  returning id into post_id;
  insert into public.activity_post_groups(post_id,group_id) values(post_id,target.group_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,group_id,details)
  values(auth.uid(),'challenge_activity.created','activity_post',post_id,target.group_id,
    jsonb_build_object('challenge_id',p_challenge_id,'suggested_points',p_suggested_points));
  return post_id;
end $$;

create function public.get_challenge_activity_feed(p_challenge_id uuid)
returns table(
  post_id uuid, author_id uuid, author_name text, author_avatar_url text,
  activity_name text, suggested_points integer, photo_path text,
  status text, approvals bigint, rejections bigint, required_votes integer,
  has_voted boolean, created_at timestamptz
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select feed.post_id,feed.author_id,feed.author_name,feed.author_avatar_url,
    feed.activity_name,feed.suggested_points,feed.photo_path,feed.status,
    feed.approvals,feed.rejections,feed.required_votes,feed.has_voted,feed.created_at
  from public.challenges c
  cross join lateral public.get_group_feed(c.group_id) feed
  join public.activity_posts ap on ap.id=feed.post_id
  where c.id=p_challenge_id and public.is_challenge_member(c.id)
    and ap.challenge_id=p_challenge_id
  order by feed.created_at desc;
$$;

create or replace function public.get_challenge_ranking(p_challenge_id uuid,p_period text default 'total')
returns table(user_id uuid,display_name text,avatar_url text,points bigint,rank bigint)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with context as (
    select c.id,c.starts_at,g.timezone,
      case p_period
        when 'day' then date_trunc('day',now() at time zone g.timezone) at time zone g.timezone
        when 'week' then date_trunc('week',now() at time zone g.timezone) at time zone g.timezone
        when 'month' then date_trunc('month',now() at time zone g.timezone) at time zone g.timezone
        when 'total' then c.starts_at else null
      end period_start
    from public.challenges c join public.groups g on g.id=c.group_id
    where c.id=p_challenge_id and public.is_challenge_member(c.id)
  ), ledger as (
    select pt.user_id,pt.points,pt.created_at
    from public.point_transactions pt where pt.challenge_id=p_challenge_id
    union all
    select gpt.user_id,gpt.points,gpt.created_at
    from public.group_point_transactions gpt
    join public.activity_posts ap on ap.id=gpt.post_id
    where ap.challenge_id=p_challenge_id
  ), totals as (
    select cm.user_id,coalesce(sum(l.points),0)::bigint points
    from context x
    join public.challenge_members cm on cm.challenge_id=x.id and cm.status='active'
    left join ledger l on l.user_id=cm.user_id and l.created_at>=x.period_start
    where x.period_start is not null group by cm.user_id
  ), ranked as (
    select t.user_id,t.points,dense_rank() over(order by t.points desc) rank from totals t
  )
  select r.user_id,p.display_name,p.avatar_url,r.points,r.rank
  from ranked r join public.profiles p on p.id=r.user_id
  order by r.rank,p.display_name;
$$;

revoke all on function public.create_challenge_activity_post(text,integer,text,uuid),
  public.get_challenge_activity_feed(uuid) from public,anon;
grant execute on function public.create_challenge_activity_post(text,integer,text,uuid),
  public.get_challenge_activity_feed(uuid) to authenticated;

commit;
