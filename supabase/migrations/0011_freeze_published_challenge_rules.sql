begin;

create function public.guard_challenge_rules() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if old.status = 'draft' then
    if new.status not in ('draft', 'active', 'cancelled') then
      raise exception 'invalid challenge status transition' using errcode = '23514';
    end if;
    if new.status = 'active' and not exists (
      select 1 from public.challenge_habits where challenge_id = old.id
    ) then
      raise exception 'a challenge needs at least one habit before publication' using errcode = '23514';
    end if;
  else
    if row(new.name, new.description, new.starts_at, new.ends_at, new.review_policy, new.group_id)
      is distinct from
      row(old.name, old.description, old.starts_at, old.ends_at, old.review_policy, old.group_id) then
      raise exception 'published challenge rules are immutable' using errcode = '23514';
    end if;
    if old.status = 'active' and new.status not in ('active', 'completed', 'cancelled') then
      raise exception 'invalid challenge status transition' using errcode = '23514';
    elsif old.status in ('completed', 'cancelled') and new.status <> old.status then
      raise exception 'a finished challenge cannot be reopened' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

create trigger challenge_rules_guard
before update on public.challenges
for each row execute function public.guard_challenge_rules();

create function public.guard_challenge_habit_rules() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  target_challenge_id uuid := case when tg_op = 'DELETE' then old.challenge_id else new.challenge_id end;
begin
  if exists (
    select 1 from public.challenges
    where id = target_challenge_id and status <> 'draft'
  ) then
    raise exception 'published challenge habits are immutable' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger challenge_habit_rules_guard
before insert or update or delete on public.challenge_habits
for each row execute function public.guard_challenge_habit_rules();

create function public.guard_attached_habit_rules() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.challenge_habits ch
    join public.challenges c on c.id = ch.challenge_id
    where ch.habit_id = old.id and c.status <> 'draft'
  ) then
    raise exception 'a habit attached to a published challenge is immutable' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger attached_habit_rules_guard
before update or delete on public.habits
for each row execute function public.guard_attached_habit_rules();

revoke all on function public.guard_challenge_rules() from public, anon, authenticated;
revoke all on function public.guard_challenge_habit_rules() from public, anon, authenticated;
revoke all on function public.guard_attached_habit_rules() from public, anon, authenticated;

commit;
