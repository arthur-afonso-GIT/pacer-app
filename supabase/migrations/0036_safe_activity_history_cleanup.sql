begin;

create or replace function public.record_activity_post_event()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_table_name = 'activity_point_proposals' then
    insert into public.activity_post_events(post_id, group_id, actor_id, event_type, points, occurred_at)
    values(new.post_id, new.group_id, new.proposer_id, 'points_proposed', new.points, new.created_at);
  elsif tg_table_name = 'activity_post_votes' and tg_op = 'DELETE' then
    -- During a post/group cascade the parent can already be gone. In that
    -- case the complete timeline is being deleted, so no withdrawal survives.
    if exists (
      select 1 from public.activity_post_groups target
      where target.post_id = old.post_id and target.group_id = old.group_id
    ) then
      insert into public.activity_post_events(post_id, group_id, actor_id, event_type, occurred_at)
      values(old.post_id, old.group_id, old.voter_id, 'rejection_withdrawn', now());
    end if;
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

commit;
