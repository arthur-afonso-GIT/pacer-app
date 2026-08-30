begin;

create or replace function public.reverse_point_transaction(
  p_transaction_id uuid,
  p_reason text
)
returns public.point_transactions
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  original public.point_transactions%rowtype;
  challenge_row public.challenges%rowtype;
  result public.point_transactions%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 or char_length(trim(p_reason)) > 1000 then
    raise exception 'reversal reason must contain between 3 and 1000 characters' using errcode = '22023';
  end if;

  select * into original
  from public.point_transactions
  where id = p_transaction_id
  for update;
  if not found then raise exception 'transaction not found' using errcode = 'P0002'; end if;

  select * into challenge_row from public.challenges where id = original.challenge_id;
  if not public.is_group_admin(challenge_row.group_id) then
    raise exception 'group admin required' using errcode = '42501';
  end if;
  if original.kind = 'reversal'
     or original.points <= 0
     or exists (
       select 1 from public.point_transactions
       where reverses_transaction_id = original.id
     ) then
    raise exception 'transaction cannot be reversed' using errcode = '55000';
  end if;

  insert into public.point_transactions(
    challenge_id, user_id, submission_id, kind, points,
    reverses_transaction_id, reason, created_by
  ) values (
    original.challenge_id, original.user_id, original.submission_id,
    'reversal', -original.points, original.id, trim(p_reason), auth.uid()
  ) returning * into result;

  insert into public.audit_events(
    actor_id, action, entity_type, entity_id, group_id, details
  ) values (
    auth.uid(), 'points.reversed', 'point_transaction', result.id,
    challenge_row.group_id,
    jsonb_build_object('reverses', original.id, 'reason', trim(p_reason))
  );

  insert into public.notifications(user_id, type, title, body, data)
  values (
    original.user_id, 'points', 'Pontuação corrigida',
    format('%s pontos foram revertidos em %s.', original.points, challenge_row.name),
    jsonb_build_object(
      'challenge_id', challenge_row.id,
      'transaction_id', result.id,
      'reverses_transaction_id', original.id
    )
  );
  return result;
end
$$;

commit;
