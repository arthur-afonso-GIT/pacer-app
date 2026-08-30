begin;

-- An invite without email/invitee is an intentional shareable code. It remains
-- single-use, hashed at rest, expiring, and can only be created by group admins.
alter table public.invites drop constraint if exists invites_check;

comment on column public.invites.email is
  'Optional recipient restriction. NULL creates a shareable, single-use invite code.';

commit;
