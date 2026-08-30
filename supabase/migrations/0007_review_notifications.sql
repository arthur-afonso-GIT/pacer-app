begin;

create function public.notify_submission_review() returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid;
  challenge_name text;
begin
  select s.submitter_id, c.name
  into owner_id, challenge_name
  from public.submissions s
  join public.challenges c on c.id = s.challenge_id
  where s.id = new.submission_id;

  insert into public.notifications(user_id, type, title, body, data)
  values (
    owner_id,
    case when new.decision = 'approved' then 'points'::public.notification_type else 'review'::public.notification_type end,
    case new.decision
      when 'approved' then 'Atividade aprovada'
      when 'rejected' then 'Atividade recusada'
      when 'disputed' then 'Atividade em análise'
      else 'Revisão concluída'
    end,
    case when new.decision = 'approved'
      then format('Você recebeu %s pontos em %s.', new.points, challenge_name)
      else format('Seu registro em %s recebeu uma nova decisão.', challenge_name)
    end,
    jsonb_build_object('submission_id', new.submission_id, 'decision', new.decision)
  );
  return new;
end
$$;

create trigger reviews_notify_submitter
after insert on public.reviews
for each row execute function public.notify_submission_review();

revoke all on function public.notify_submission_review() from public, anon, authenticated;

commit;
