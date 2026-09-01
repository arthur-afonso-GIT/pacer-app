begin;

create table public.activity_post_events (
  id bigint generated always as identity primary key,
  post_id uuid not null,
  group_id uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (
    event_type in (
      'points_proposed',
      'rejection_recorded',
      'rejection_withdrawn',
      'activity_approved',
      'activity_rejected'
    )
  ),
  points integer check (points is null or points between 1 and 100000),
  occurred_at timestamptz not null default now(),
  foreign key (post_id, group_id)
    references public.activity_post_groups(post_id, group_id) on delete cascade
);

create index activity_post_events_timeline_idx
  on public.activity_post_events(group_id, post_id, occurred_at, id);

alter table public.activity_post_events enable row level security;
create policy activity_post_events_read_member
on public.activity_post_events for select to authenticated
using (public.is_active_group_member(group_id));
revoke insert, update, delete on public.activity_post_events from anon, authenticated;

create function public.record_activity_post_event()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_table_name = 'activity_point_proposals' then
    insert into public.activity_post_events(post_id, group_id, actor_id, event_type, points, occurred_at)
    values(new.post_id, new.group_id, new.proposer_id, 'points_proposed', new.points, new.created_at);
  elsif tg_table_name = 'activity_post_votes' and tg_op = 'DELETE' then
    insert into public.activity_post_events(post_id, group_id, actor_id, event_type, occurred_at)
    values(old.post_id, old.group_id, old.voter_id, 'rejection_withdrawn', now());
  elsif tg_table_name = 'activity_post_votes' then
    insert into public.activity_post_events(post_id, group_id, actor_id, event_type, occurred_at)
    values(new.post_id, new.group_id, new.voter_id, 'rejection_recorded', new.created_at);
  elsif tg_table_name = 'activity_post_groups' and old.status = 'pending' and new.status <> old.status then
    insert into public.activity_post_events(post_id, group_id, actor_id, event_type, occurred_at)
    values(
      new.post_id,
      new.group_id,
      auth.uid(),
      case new.status
        when 'approved' then 'activity_approved'
        else 'activity_rejected'
      end,
      coalesce(new.resolved_at, now())
    );
  end if;
  return null;
end $$;

create trigger activity_proposal_history
after insert on public.activity_point_proposals
for each row execute function public.record_activity_post_event();

create trigger activity_vote_history
after insert or update or delete on public.activity_post_votes
for each row execute function public.record_activity_post_event();

create trigger activity_resolution_history
after update of status on public.activity_post_groups
for each row execute function public.record_activity_post_event();

insert into public.activity_post_events(
  post_id, group_id, actor_id, event_type, points, occurred_at
)
select post_id, group_id, proposer_id, 'points_proposed', points, created_at
from public.activity_point_proposals;

insert into public.activity_post_events(
  post_id, group_id, actor_id, event_type, occurred_at
)
select post_id, group_id, voter_id, 'rejection_recorded', created_at
from public.activity_post_votes
where decision = 'rejected';

insert into public.activity_post_events(
  post_id, group_id, event_type, occurred_at
)
select
  post_id,
  group_id,
  case status
    when 'approved' then 'activity_approved'
    else 'activity_rejected'
  end,
  resolved_at
from public.activity_post_groups
where status <> 'pending' and resolved_at is not null;

create function public.get_group_activity_history(p_group_id uuid)
returns table(
  event_id bigint,
  post_id uuid,
  actor_id uuid,
  actor_name text,
  event_type text,
  points integer,
  occurred_at timestamptz
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select
    event.id,
    event.post_id,
    event.actor_id,
    coalesce(profile.display_name, 'Sistema'),
    event.event_type,
    event.points,
    event.occurred_at
  from public.activity_post_events event
  left join public.profiles profile on profile.id = event.actor_id
  where event.group_id = p_group_id
    and public.is_active_group_member(p_group_id)
  order by event.occurred_at, event.id;
$$;

revoke all on function public.record_activity_post_event() from public, anon, authenticated;
revoke all on function public.get_group_activity_history(uuid) from public, anon;
grant execute on function public.get_group_activity_history(uuid) to authenticated;

commit;
