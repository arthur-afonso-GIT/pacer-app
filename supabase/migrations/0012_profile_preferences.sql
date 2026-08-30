begin;

alter table public.profiles
  add column theme_preference text not null default 'system'
    check (theme_preference in ('system', 'light', 'dark')),
  add column notifications_enabled boolean not null default true;

commit;
