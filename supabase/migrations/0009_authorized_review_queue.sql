begin;

create function public.get_review_queue(p_challenge_id uuid)
returns setof public.submissions
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select s.* from public.submissions s
  join public.challenges c on c.id = s.challenge_id
  where s.challenge_id = p_challenge_id
    and s.status = 'pending'
    and s.submitter_id <> auth.uid()
    and public.is_challenge_member(c.id)
    and (
      c.review_policy = 'any_other_member'
      or (c.review_policy = 'admins_only' and public.is_group_admin(c.group_id))
      or (c.review_policy = 'selected_reviewers' and exists (
        select 1 from public.challenge_reviewers cr
        where cr.challenge_id = c.id and cr.user_id = auth.uid()
      ))
    )
  order by s.submitted_at;
$$;

revoke all on function public.get_review_queue(uuid) from public, anon;
grant execute on function public.get_review_queue(uuid) to authenticated;
commit;
