begin;

create function public.correct_point_transaction(
  p_transaction_id uuid,
  p_corrected_points integer,
  p_reason text
)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  original public.point_transactions%rowtype;
  challenge_row public.challenges%rowtype;
  reversal public.point_transactions%rowtype;
  adjustment public.point_transactions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_corrected_points is null or p_corrected_points not between 1 and 100000 then
    raise exception 'corrected points must be between 1 and 100000' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 or char_length(trim(p_reason)) > 1000 then
    raise exception 'correction reason must contain between 3 and 1000 characters' using errcode = '22023';
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
  if original.kind <> 'award' or original.points <= 0
     or exists (
       select 1 from public.point_transactions
       where reverses_transaction_id = original.id
     )
     or exists (
       select 1 from public.point_transactions
       where submission_id = original.submission_id and kind = 'adjustment'
     ) then
    raise exception 'transaction cannot be corrected' using errcode = '55000';
  end if;
  if original.points = p_corrected_points then
    raise exception 'corrected points must differ from original points' using errcode = '22023';
  end if;

  insert into public.point_transactions(
    challenge_id, user_id, submission_id, kind, points,
    reverses_transaction_id, reason, created_by
  ) values (
    original.challenge_id, original.user_id, original.submission_id,
    'reversal', -original.points, original.id, trim(p_reason), auth.uid()
  ) returning * into reversal;

  insert into public.point_transactions(
    challenge_id, user_id, submission_id, kind, points, reason, created_by
  ) values (
    original.challenge_id, original.user_id, original.submission_id,
    'adjustment', p_corrected_points, trim(p_reason), auth.uid()
  ) returning * into adjustment;

  insert into public.audit_events(
    actor_id, action, entity_type, entity_id, group_id, details
  ) values (
    auth.uid(), 'points.corrected', 'point_transaction', adjustment.id,
    challenge_row.group_id,
    jsonb_build_object(
      'original_transaction_id', original.id,
      'reversal_transaction_id', reversal.id,
      'original_points', original.points,
      'corrected_points', p_corrected_points,
      'reason', trim(p_reason)
    )
  );

  insert into public.notifications(user_id, type, title, body, data)
  values (
    original.user_id, 'points', 'Pontuação corrigida',
    format('Sua pontuação em %s foi corrigida de %s para %s pontos.',
      challenge_row.name, original.points, p_corrected_points),
    jsonb_build_object(
      'challenge_id', challenge_row.id,
      'original_transaction_id', original.id,
      'adjustment_transaction_id', adjustment.id
    )
  );

  return jsonb_build_object(
    'reversal_id', reversal.id,
    'adjustment_id', adjustment.id,
    'corrected_points', adjustment.points
  );
end $$;

revoke all on function public.correct_point_transaction(uuid, integer, text) from public, anon;
grant execute on function public.correct_point_transaction(uuid, integer, text) to authenticated;

commit;
