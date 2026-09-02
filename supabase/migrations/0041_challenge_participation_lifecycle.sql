begin;

create table public.challenge_invitation_responses (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response = 'dismissed'),
  responded_at timestamptz not null default now(),
  primary key (challenge_id,user_id)
);
alter table public.challenge_invitation_responses enable row level security;
create policy challenge_invitation_responses_read_self
on public.challenge_invitation_responses for select to authenticated
using (user_id=auth.uid());
revoke insert,update,delete on public.challenge_invitation_responses from anon,authenticated;

create function public.dismiss_challenge_invite(p_challenge_id uuid)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.challenges%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into target from public.challenges where id=p_challenge_id;
  if not found or target.participation_mode<>'opt_in' or not public.is_active_group_member(target.group_id) then
    raise exception 'challenge invitation not available' using errcode='42501';
  end if;
  if public.is_challenge_member(p_challenge_id) then
    raise exception 'leave the challenge instead of dismissing it' using errcode='55000';
  end if;
  insert into public.challenge_invitation_responses(challenge_id,user_id,response)
  values(p_challenge_id,auth.uid(),'dismissed')
  on conflict(challenge_id,user_id) do update set response='dismissed',responded_at=now();
  insert into public.audit_events(actor_id,action,entity_type,entity_id,group_id)
  values(auth.uid(),'challenge_invite.dismissed','challenge',p_challenge_id,target.group_id);
  return true;
end $$;

create function public.leave_group_challenge(p_challenge_id uuid)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target public.challenges%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into target from public.challenges where id=p_challenge_id for update;
  if not found or target.participation_mode<>'opt_in' or not public.is_challenge_member(p_challenge_id) then
    raise exception 'active challenge participation required' using errcode='42501';
  end if;
  if target.created_by=auth.uid() then
    raise exception 'the creator must cancel the challenge series' using errcode='55000';
  end if;
  update public.challenge_members set status='left'
  where challenge_id=p_challenge_id and user_id=auth.uid() and status='active';
  insert into public.challenge_invitation_responses(challenge_id,user_id,response)
  values(p_challenge_id,auth.uid(),'dismissed')
  on conflict(challenge_id,user_id) do update set response='dismissed',responded_at=now();
  insert into public.audit_events(actor_id,action,entity_type,entity_id,group_id)
  values(auth.uid(),'challenge.left','challenge',p_challenge_id,target.group_id);
  return true;
end $$;

create function public.cancel_challenge_series(p_series_id uuid)
returns integer
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare affected integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if not exists(select 1 from public.challenge_series s where s.id=p_series_id and s.created_by=auth.uid()) then
    raise exception 'challenge series creator required' using errcode='42501';
  end if;
  update public.challenges set status='cancelled',updated_at=now()
  where series_id=p_series_id and status in ('draft','active');
  get diagnostics affected=row_count;
  insert into public.notifications(user_id,type,title,body,data)
  select distinct cm.user_id,'challenge'::public.notification_type,'Desafio encerrado',
    format('O desafio %s foi encerrado pelo criador.',c.name),
    jsonb_build_object('challenge_id',c.id,'group_id',c.group_id,'series_id',p_series_id)
  from public.challenges c join public.challenge_members cm on cm.challenge_id=c.id and cm.status='active'
  where c.series_id=p_series_id and cm.user_id<>auth.uid();
  insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'challenge_series.cancelled','challenge_series',p_series_id,
    jsonb_build_object('challenge_count',affected));
  return affected;
end $$;

create or replace function public.get_my_challenge_hub()
returns table(
  challenge_id uuid,series_id uuid,group_id uuid,group_name text,
  name text,description text,starts_at timestamptz,ends_at timestamptz,
  status public.challenge_status,participation_mode text,
  is_participant boolean,is_creator boolean,participant_count bigint
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select c.id,c.series_id,c.group_id,g.name,c.name,c.description,c.starts_at,c.ends_at,
    c.status,c.participation_mode,
    exists(select 1 from public.challenge_members mine where mine.challenge_id=c.id and mine.user_id=auth.uid() and mine.status='active'),
    c.created_by=auth.uid(),
    (select count(*) from public.challenge_members cm where cm.challenge_id=c.id and cm.status='active')
  from public.challenges c join public.groups g on g.id=c.group_id
  where public.is_active_group_member(c.group_id)
    and c.status in ('draft','active') and c.ends_at>now()
    and not exists(
      select 1 from public.challenge_invitation_responses response
      where response.challenge_id=c.id and response.user_id=auth.uid()
        and response.response='dismissed'
        and not exists(
          select 1 from public.challenge_members mine
          where mine.challenge_id=c.id and mine.user_id=auth.uid() and mine.status='active'
        )
    )
  order by c.created_at desc,c.id;
$$;

revoke all on function public.dismiss_challenge_invite(uuid),
  public.leave_group_challenge(uuid),public.cancel_challenge_series(uuid) from public,anon;
grant execute on function public.dismiss_challenge_invite(uuid),
  public.leave_group_challenge(uuid),public.cancel_challenge_series(uuid) to authenticated;

commit;
