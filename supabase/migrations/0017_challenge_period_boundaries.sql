begin;

drop policy submissions_create_self on public.submissions;
create policy submissions_create_self
on public.submissions for insert to authenticated
with check (
  submitter_id = auth.uid()
  and status = 'pending'
  and public.is_challenge_member(challenge_id)
  and exists (
    select 1 from public.challenges c
    where c.id = challenge_id
      and c.status = 'active'
      and now() >= c.starts_at
      and now() < c.ends_at
  )
);

create or replace function public.validate_submission_limits() returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  challenge_status public.challenge_status;
  challenge_starts_at timestamptz;
  challenge_ends_at timestamptz;
  group_timezone text;
  daily_limit integer;
  local_today date;
  local_start date;
  local_last_day date;
  used_count integer;
begin
  select c.status, c.starts_at, c.ends_at, g.timezone
  into challenge_status, challenge_starts_at, challenge_ends_at, group_timezone
  from public.challenges c
  join public.groups g on g.id = c.group_id
  where c.id = new.challenge_id;

  if challenge_status is distinct from 'active' then
    raise exception 'challenge is not active' using errcode = '55000';
  end if;
  if now() < challenge_starts_at or now() >= challenge_ends_at then
    raise exception 'challenge is outside its active period' using errcode = '55000';
  end if;

  local_today := (now() at time zone group_timezone)::date;
  local_start := (challenge_starts_at at time zone group_timezone)::date;
  local_last_day := ((challenge_ends_at - interval '1 microsecond') at time zone group_timezone)::date;

  if new.occurred_on < local_start or new.occurred_on > local_last_day then
    raise exception 'activity date is outside the challenge period' using errcode = '22023';
  end if;
  if new.occurred_on > local_today then
    raise exception 'future activity dates are forbidden' using errcode = '22023';
  end if;

  select max_submissions_per_day into daily_limit
  from public.challenge_habits
  where id = new.challenge_habit_id and challenge_id = new.challenge_id;
  if daily_limit is null then
    raise exception 'habit is not part of this challenge' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    new.submitter_id::text || ':' || new.challenge_habit_id::text || ':' || new.occurred_on::text,
    0
  ));
  select count(*) into used_count
  from public.submissions
  where submitter_id = new.submitter_id
    and challenge_habit_id = new.challenge_habit_id
    and occurred_on = new.occurred_on
    and status <> 'cancelled';

  if used_count >= daily_limit then
    raise exception 'daily submission limit reached' using errcode = '23514';
  end if;
  return new;
end
$$;

commit;
