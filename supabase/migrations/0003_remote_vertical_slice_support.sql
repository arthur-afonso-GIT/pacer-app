begin;

-- Private evidence bucket. Storage object names are `<submission_uuid>/<random_filename>`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy evidence_objects_insert_submitter
on storage.objects for insert to authenticated
with check (
  bucket_id = 'evidence'
  and exists (
    select 1
    from public.submissions s
    where s.id = (storage.foldername(name))[1]::uuid
      and s.submitter_id = auth.uid()
      and s.status = 'pending'
  )
);

create policy evidence_objects_read_active_member
on storage.objects for select to authenticated
using (
  bucket_id = 'evidence'
  and exists (
    select 1
    from public.evidence e
    join public.submissions s on s.id = e.submission_id
    where e.storage_bucket = bucket_id
      and e.storage_path = name
      and public.is_challenge_member(s.challenge_id)
  )
);

create policy evidence_objects_delete_pending_submitter
on storage.objects for delete to authenticated
using (
  bucket_id = 'evidence'
  and exists (
    select 1
    from public.submissions s
    where s.id = (storage.foldername(name))[1]::uuid
      and s.submitter_id = auth.uid()
      and s.status = 'pending'
  )
);

-- Invite tokens are only returned once. Only a SHA-256 digest is stored.
create function public.create_group_invite(
  p_group_id uuid,
  p_email extensions.citext default null,
  p_role public.group_role default 'member',
  p_expires_in interval default interval '7 days'
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null or not public.is_group_admin(p_group_id) then
    raise exception 'group admin required' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'owner invites are forbidden' using errcode = '22023';
  end if;
  if p_expires_in <= interval '0 seconds' or p_expires_in > interval '30 days' then
    raise exception 'invalid invite expiry' using errcode = '22023';
  end if;

  insert into public.invites(group_id, email, token_hash, role, invited_by, expires_at)
  values (p_group_id, nullif(lower(trim(p_email::text)), '')::extensions.citext,
          encode(extensions.digest(token, 'sha256'), 'hex'), p_role, auth.uid(), now() + p_expires_in);
  return token;
end
$$;

create function public.accept_group_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  invitation public.invites%rowtype;
  caller_email extensions.citext;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if nullif(trim(p_token), '') is null then raise exception 'invite token required' using errcode = '22023'; end if;

  select * into invitation
  from public.invites
  where token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
  for update;

  if not found or invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'invite is invalid or expired' using errcode = '22023';
  end if;

  select email::extensions.citext into caller_email from auth.users where id = auth.uid();
  if invitation.invitee_id is not null and invitation.invitee_id <> auth.uid() then
    raise exception 'invite belongs to another user' using errcode = '42501';
  end if;
  if invitation.email is not null and invitation.email <> caller_email then
    raise exception 'invite belongs to another email' using errcode = '42501';
  end if;

  insert into public.group_members(group_id, user_id, role, status, left_at)
  values (invitation.group_id, auth.uid(), invitation.role, 'active', null)
  on conflict (group_id, user_id) do update
  set role = excluded.role, status = 'active', left_at = null, joined_at = now();

  update public.invites
  set status = 'accepted', invitee_id = auth.uid(), accepted_at = now()
  where id = invitation.id;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, group_id, details)
  values (auth.uid(), 'invite.accepted', 'invite', invitation.id, invitation.group_id, '{}'::jsonb);
  return invitation.group_id;
end
$$;

-- Rankings always aggregate signed ledger rows; no profile score is consulted.
create function public.get_challenge_ranking(p_challenge_id uuid, p_period text default 'total')
returns table(user_id uuid, display_name text, avatar_url text, points bigint, rank bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with context as (
    select c.id, c.starts_at, g.timezone,
      case p_period
        when 'day' then date_trunc('day', now() at time zone g.timezone) at time zone g.timezone
        when 'week' then date_trunc('week', now() at time zone g.timezone) at time zone g.timezone
        when 'month' then date_trunc('month', now() at time zone g.timezone) at time zone g.timezone
        when 'total' then c.starts_at
        else null
      end as period_start
    from public.challenges c join public.groups g on g.id = c.group_id
    where c.id = p_challenge_id and public.is_challenge_member(c.id)
  ), totals as (
    select cm.user_id, coalesce(sum(pt.points), 0)::bigint as points
    from context x
    join public.challenge_members cm on cm.challenge_id = x.id and cm.status = 'active'
    left join public.point_transactions pt
      on pt.challenge_id = x.id and pt.user_id = cm.user_id and pt.created_at >= x.period_start
    where x.period_start is not null
    group by cm.user_id
  )
  select t.user_id, p.display_name, p.avatar_url, t.points,
         dense_rank() over (order by t.points desc, p.display_name asc) as rank
  from totals t join public.profiles p on p.id = t.user_id
  order by rank, p.display_name;
$$;

revoke all on function public.create_group_invite(uuid, extensions.citext, public.group_role, interval) from public;
revoke all on function public.accept_group_invite(text) from public;
revoke all on function public.get_challenge_ranking(uuid, text) from public;
grant execute on function public.create_group_invite(uuid, extensions.citext, public.group_role, interval) to authenticated;
grant execute on function public.accept_group_invite(text) to authenticated;
grant execute on function public.get_challenge_ranking(uuid, text) to authenticated;

commit;
