begin;

create function public.save_profile(
  p_display_name text,
  p_avatar_url text,
  p_theme_preference text,
  p_notifications_enabled boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  saved_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 2 and 80 then
    raise exception 'display name must contain between 2 and 80 characters' using errcode = '22023';
  end if;
  if p_theme_preference not in ('system', 'light', 'dark') then
    raise exception 'invalid theme preference' using errcode = '22023';
  end if;
  if p_notifications_enabled is null then
    raise exception 'notification preference is required' using errcode = '22023';
  end if;

  insert into public.profiles(
    id, display_name, avatar_url, theme_preference,
    notifications_enabled, updated_at
  )
  values (
    auth.uid(), trim(p_display_name), nullif(trim(coalesce(p_avatar_url, '')), ''),
    p_theme_preference, p_notifications_enabled, now()
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      theme_preference = excluded.theme_preference,
      notifications_enabled = excluded.notifications_enabled,
      updated_at = now()
  returning * into saved_profile;

  return saved_profile;
end
$$;

revoke all on function public.save_profile(text, text, text, boolean) from public, anon;
grant execute on function public.save_profile(text, text, text, boolean) to authenticated;

commit;
