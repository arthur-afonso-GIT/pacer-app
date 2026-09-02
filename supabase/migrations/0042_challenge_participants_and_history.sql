begin;

create function public.get_challenge_participants(p_challenge_id uuid)
returns table(
  user_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  is_creator boolean
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select cm.user_id,p.display_name,p.avatar_url,cm.joined_at,c.created_by=cm.user_id
  from public.challenges c
  join public.challenge_members cm on cm.challenge_id=c.id and cm.status='active'
  join public.profiles p on p.id=cm.user_id
  where c.id=p_challenge_id and public.is_active_group_member(c.group_id)
  order by (c.created_by=cm.user_id) desc,p.display_name,cm.user_id;
$$;

drop function public.get_my_challenge_hub();
create function public.get_my_challenge_hub()
returns table(
  challenge_id uuid,series_id uuid,group_id uuid,group_name text,
  name text,description text,starts_at timestamptz,ends_at timestamptz,
  status public.challenge_status,participation_mode text,
  is_participant boolean,is_creator boolean,participant_count bigint,
  series_group_count bigint
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select c.id,c.series_id,c.group_id,g.name,c.name,c.description,c.starts_at,c.ends_at,
    c.status,c.participation_mode,
    exists(select 1 from public.challenge_members mine where mine.challenge_id=c.id and mine.user_id=auth.uid() and mine.status='active'),
    c.created_by=auth.uid(),
    (select count(*) from public.challenge_members cm where cm.challenge_id=c.id and cm.status='active'),
    case when c.series_id is null then 1 else
      (select count(*) from public.challenges sibling where sibling.series_id=c.series_id)
    end
  from public.challenges c join public.groups g on g.id=c.group_id
  where public.is_active_group_member(c.group_id)
    and (
      c.created_by=auth.uid()
      or exists(
        select 1 from public.challenge_members mine
        where mine.challenge_id=c.id and mine.user_id=auth.uid() and mine.status='active'
      )
      or (
        c.participation_mode='opt_in' and c.status='active' and c.ends_at>now()
        and not exists(
          select 1 from public.challenge_invitation_responses response
          where response.challenge_id=c.id and response.user_id=auth.uid()
            and response.response='dismissed'
        )
      )
    )
  order by c.created_at desc,c.id;
$$;

revoke all on function public.get_challenge_participants(uuid),
  public.get_my_challenge_hub() from public,anon;
grant execute on function public.get_challenge_participants(uuid),
  public.get_my_challenge_hub() to authenticated;

commit;
