begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.group_role as enum ('member', 'admin', 'owner');
create type public.membership_status as enum ('pending', 'active', 'left', 'removed');
create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.challenge_status as enum ('draft', 'active', 'completed', 'cancelled');
create type public.review_policy as enum ('any_other_member', 'admins_only', 'selected_reviewers');
create type public.challenge_member_status as enum ('active', 'left', 'removed');
create type public.submission_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'disputed');
create type public.review_decision as enum ('approved', 'rejected', 'cancelled', 'disputed');
create type public.point_transaction_kind as enum ('award', 'reversal', 'adjustment');
create type public.notification_type as enum ('invite', 'submission', 'review', 'challenge', 'points', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  timezone text not null default 'UTC',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PostgreSQL cannot use pg_timezone_names directly in a CHECK; enforce via trigger.
create function public.enforce_valid_timezone() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid IANA timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end $$;
create trigger groups_valid_timezone before insert or update of timezone on public.groups
for each row execute function public.enforce_valid_timezone();

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'member',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (group_id, user_id),
  check ((status in ('left','removed')) = (left_at is not null))
);

create table public.invites (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email extensions.citext,
  invitee_id uuid references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  role public.group_role not null default 'member' check (role <> 'owner'),
  status public.invite_status not null default 'pending',
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (email is not null or invitee_id is not null),
  check (expires_at > created_at),
  check ((status = 'accepted') = (accepted_at is not null))
);

create table public.challenges (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  status public.challenge_status not null default 'draft',
  review_policy public.review_policy not null default 'any_other_member',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.challenge_member_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create table public.challenge_reviewers (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id),
  foreign key (challenge_id, user_id) references public.challenge_members(challenge_id, user_id) on delete cascade
);

create table public.habits (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.challenge_habits (
  id uuid primary key default extensions.gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  habit_id uuid not null references public.habits(id),
  points integer not null check (points between 1 and 100000),
  max_submissions_per_day integer not null default 1 check (max_submissions_per_day between 1 and 100),
  created_at timestamptz not null default now(),
  unique (challenge_id, habit_id),
  unique (id, challenge_id)
);

create table public.submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  challenge_id uuid not null,
  challenge_habit_id uuid not null,
  submitter_id uuid not null references public.profiles(id),
  status public.submission_status not null default 'pending',
  occurred_on date not null default current_date,
  note text check (char_length(note) <= 2000),
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (challenge_habit_id, challenge_id) references public.challenge_habits(id, challenge_id),
  foreign key (challenge_id, submitter_id) references public.challenge_members(challenge_id, user_id),
  check ((status in ('approved','rejected')) = (resolved_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create table public.evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  storage_bucket text not null default 'evidence',
  storage_path text not null,
  media_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id),
  reviewer_id uuid not null references public.profiles(id),
  decision public.review_decision not null,
  points integer check (points between 1 and 100000),
  reason text not null check (char_length(trim(reason)) between 1 and 2000),
  constraint reviews_points_match_decision check (
    (decision = 'approved' and points is not null) or
    (decision <> 'approved' and points is null)
  ),
  created_at timestamptz not null default now()
);

create table public.submission_status_history (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  from_status public.submission_status,
  to_status public.submission_status not null,
  actor_id uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now(),
  check (from_status is distinct from to_status)
);

create table public.point_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id),
  user_id uuid not null references public.profiles(id),
  submission_id uuid references public.submissions(id),
  kind public.point_transaction_kind not null,
  points integer not null check (points <> 0),
  reverses_transaction_id uuid unique references public.point_transactions(id),
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((kind = 'award' and points > 0 and submission_id is not null and reverses_transaction_id is null)
      or (kind = 'reversal' and points < 0 and reverses_transaction_id is not null)
      or (kind = 'adjustment' and reverses_transaction_id is null)),
  unique (submission_id, kind)
);

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  body text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  group_id uuid references public.groups(id) on delete set null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null default now()
);

create index group_members_user_active_idx on public.group_members(user_id, group_id) where status = 'active';
create index invites_group_status_idx on public.invites(group_id, status, expires_at);
create index challenges_group_status_idx on public.challenges(group_id, status);
create index challenge_members_user_idx on public.challenge_members(user_id, challenge_id) where status = 'active';
create index submissions_challenge_status_idx on public.submissions(challenge_id, status, submitted_at desc);
create index submissions_submitter_idx on public.submissions(submitter_id, submitted_at desc);
create index evidence_submission_idx on public.evidence(submission_id);
create index status_history_submission_idx on public.submission_status_history(submission_id, created_at);
create index point_transactions_score_idx on public.point_transactions(challenge_id, user_id, created_at);
create index notifications_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, occurred_at desc);

comment on table public.point_transactions is 'Append-only score ledger. Corrections are compensating reversal rows, never updates/deletes.';
comment on column public.invites.token_hash is 'Store only a cryptographic hash; raw invite tokens must never be persisted.';

commit;
