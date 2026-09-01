begin;

create table public.challenge_series (
  id uuid primary key default extensions.gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  review_policy public.review_policy not null default 'any_other_member',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.challenges
  add column series_id uuid references public.challenge_series(id) on delete set null,
  add column participation_mode text not null default 'automatic'
    check (participation_mode in ('automatic', 'opt_in'));

create index challenges_series_idx on public.challenges(series_id) where series_id is not null;

alter table public.challenge_series enable row level security;
create policy challenge_series_read_group_member on public.challenge_series
for select to authenticated using (
  created_by = auth.uid() or exists (
    select 1 from public.challenges c
    where c.series_id = challenge_series.id
      and public.is_active_group_member(c.group_id)
  )
);
revoke insert, update, delete on public.challenge_series from anon, authenticated;

create or replace function public.sync_challenge_members_on_challenge()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if new.participation_mode = 'automatic' then
    insert into public.challenge_members(challenge_id, user_id, status)
    select new.id, gm.user_id, 'active'
    from public.group_members gm
    where gm.group_id = new.group_id and gm.status = 'active'
    on conflict (challenge_id, user_id) do update
    set status = 'active', joined_at = now();
  end if;
  return new;
end $$;

create or replace function public.sync_challenges_on_group_member()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'active' then
    insert into public.challenge_members(challenge_id, user_id, status)
    select c.id, new.user_id, 'active'
    from public.challenges c
    where c.group_id = new.group_id
      and c.status in ('draft', 'active')
      and c.participation_mode = 'automatic'
    on conflict (challenge_id, user_id) do update
    set status = 'active', joined_at = now();
  elsif tg_op = 'UPDATE' and old.status = 'active' and new.status in ('left', 'removed') then
    update public.challenge_members cm
    set status = 'removed'
    from public.challenges c
    where c.id = cm.challenge_id
      and c.group_id = new.group_id
      and cm.user_id = new.user_id;
  end if;
  return new;
end $$;

create function public.create_group_challenge_invites(
  p_name text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_group_ids uuid[],
  p_review_policy public.review_policy default 'any_other_member'
)
returns uuid[]
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  targets uuid[];
  new_series_id uuid;
  challenge_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'challenge name must contain between 2 and 120 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(p_description, '')) > 2000 or p_ends_at <= p_starts_at then
    raise exception 'invalid challenge details' using errcode = '22023';
  end if;
  select array_agg(distinct target) into targets
  from unnest(coalesce(p_group_ids, '{}'::uuid[])) target;
  if coalesce(cardinality(targets), 0) = 0 then
    raise exception 'select at least one group' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(targets) target
    where not public.is_active_group_member(target)
  ) then
    raise exception 'active group membership required for every destination' using errcode = '42501';
  end if;

  insert into public.challenge_series(created_by,name,description,starts_at,ends_at,review_policy)
  values(auth.uid(),trim(p_name),nullif(trim(coalesce(p_description,'')),''),p_starts_at,p_ends_at,p_review_policy)
  returning id into new_series_id;

  with inserted as (
    insert into public.challenges(
      group_id,series_id,name,description,status,review_policy,starts_at,ends_at,
      created_by,participation_mode
    )
    select target,new_series_id,trim(p_name),nullif(trim(coalesce(p_description,'')),''),
      'active',p_review_policy,p_starts_at,p_ends_at,auth.uid(),'opt_in'
    from unnest(targets) target
    returning id
  ) select array_agg(id) into challenge_ids from inserted;

  insert into public.challenge_members(challenge_id,user_id,status)
  select id,auth.uid(),'active' from unnest(challenge_ids) id;

  insert into public.notifications(user_id,type,title,body,data)
  select gm.user_id,'challenge',format('Novo desafio: %s',trim(p_name)),
    'Um desafio foi publicado no seu grupo. Entre se quiser participar.',
    jsonb_build_object('challenge_id',c.id,'group_id',c.group_id,'series_id',new_series_id)
  from public.challenges c
  join public.group_members gm on gm.group_id=c.group_id and gm.status='active'
  where c.id=any(challenge_ids) and gm.user_id<>auth.uid();

  insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'challenge_series.created','challenge_series',new_series_id,
    jsonb_build_object('group_ids',targets,'challenge_ids',challenge_ids));
  return challenge_ids;
end $$;

create function public.join_group_challenge(p_challenge_id uuid)
returns public.challenge_members
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.challenges%rowtype; membership public.challenge_members%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into target from public.challenges where id=p_challenge_id for update;
  if not found or target.participation_mode<>'opt_in' or target.status<>'active' then
    raise exception 'challenge is not open for participation' using errcode='55000';
  end if;
  if target.ends_at<=now() or not public.is_active_group_member(target.group_id) then
    raise exception 'active group membership required' using errcode='42501';
  end if;
  insert into public.challenge_members(challenge_id,user_id,status,joined_at)
  values(p_challenge_id,auth.uid(),'active',now())
  on conflict(challenge_id,user_id) do update set status='active',joined_at=now()
  returning * into membership;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,group_id)
  values(auth.uid(),'challenge.joined','challenge',p_challenge_id,target.group_id);
  return membership;
end $$;

create function public.get_my_challenge_hub()
returns table(
  challenge_id uuid, series_id uuid, group_id uuid, group_name text,
  name text, description text, starts_at timestamptz, ends_at timestamptz,
  status public.challenge_status, participation_mode text,
  is_participant boolean, is_creator boolean, participant_count bigint
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select c.id,c.series_id,c.group_id,g.name,c.name,c.description,c.starts_at,c.ends_at,
    c.status,c.participation_mode,
    exists(select 1 from public.challenge_members mine where mine.challenge_id=c.id and mine.user_id=auth.uid() and mine.status='active'),
    c.created_by=auth.uid(),
    (select count(*) from public.challenge_members cm where cm.challenge_id=c.id and cm.status='active')
  from public.challenges c
  join public.groups g on g.id=c.group_id
  where public.is_active_group_member(c.group_id)
    and c.status in ('draft','active')
    and c.ends_at>now()
  order by c.created_at desc,c.id;
$$;

revoke all on function public.create_group_challenge_invites(text,text,timestamptz,timestamptz,uuid[],public.review_policy),
  public.join_group_challenge(uuid),public.get_my_challenge_hub() from public,anon;
grant execute on function public.create_group_challenge_invites(text,text,timestamptz,timestamptz,uuid[],public.review_policy),
  public.join_group_challenge(uuid),public.get_my_challenge_hub() to authenticated;

commit;
