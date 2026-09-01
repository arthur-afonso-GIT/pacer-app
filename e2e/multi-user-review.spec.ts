import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import type { Database } from '../src/infrastructure/supabase/database.types'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

test('a majority of other members validates private evidence before points are awarded', async ({
  page,
}) => {
  test.skip(
    !url || !serviceKey || !anonKey,
    'Requires a disposable local Supabase instance',
  )
  if (!url || !serviceKey || !anonKey) return

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
  const secondReviewer = createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  })
  const suffix = crypto.randomUUID()
  const password = 'Pacer-test-2026!'
  const participantEmail = `participant-${suffix}@example.test`
  const firstReviewerEmail = `reviewer-a-${suffix}@example.test`
  const secondReviewerEmail = `reviewer-b-${suffix}@example.test`
  const createdUsers: string[] = []
  let groupId: string | undefined
  let evidencePath: string | undefined

  try {
    for (const [email, displayName] of [
      [participantEmail, 'Pessoa Participante'],
      [firstReviewerEmail, 'Pessoa Revisora A'],
      [secondReviewerEmail, 'Pessoa Revisora B'],
    ] as const) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      })
      if (error) throw error
      createdUsers.push(data.user.id)
    }
    const [participantId, firstReviewerId, secondReviewerId] = createdUsers as [
      string,
      string,
      string,
    ]
    const { data: group, error: groupError } = await admin
      .from('groups')
      .insert({
        name: 'Grupo E2E',
        description: 'Validação multiusuário',
        timezone: 'America/Fortaleza',
        created_by: firstReviewerId,
      })
      .select()
      .single()
    if (groupError) throw groupError
    groupId = group.id
    const { error: memberError } = await admin.from('group_members').insert([
      {
        group_id: group.id,
        user_id: firstReviewerId,
        role: 'owner',
        status: 'active',
      },
      {
        group_id: group.id,
        user_id: participantId,
        role: 'member',
        status: 'active',
      },
      {
        group_id: group.id,
        user_id: secondReviewerId,
        role: 'member',
        status: 'active',
      },
    ])
    if (memberError) throw memberError
    const { data: challenge, error: challengeError } = await admin
      .from('challenges')
      .insert({
        group_id: group.id,
        created_by: firstReviewerId,
        name: 'Desafio E2E',
        status: 'draft',
        review_policy: 'any_other_member',
        starts_at: new Date(Date.now() - 86_400_000).toISOString(),
        ends_at: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .select()
      .single()
    if (challengeError) throw challengeError
    const { error: challengeMembersError } = await admin
      .from('challenge_members')
      .upsert(
        createdUsers.map((userId) => ({
          challenge_id: challenge.id,
          user_id: userId,
          status: 'active' as const,
        })),
        { onConflict: 'challenge_id,user_id' },
      )
    if (challengeMembersError) throw challengeMembersError
    const { data: habit, error: habitError } = await admin
      .from('habits')
      .insert({ owner_id: firstReviewerId, name: 'Caminhada E2E' })
      .select()
      .single()
    if (habitError) throw habitError
    const { data: attachment, error: attachmentError } = await admin
      .from('challenge_habits')
      .insert({ challenge_id: challenge.id, habit_id: habit.id, points: 10 })
      .select()
      .single()
    if (attachmentError) throw attachmentError
    const { error: activationError } = await admin
      .from('challenges')
      .update({ status: 'active' })
      .eq('id', challenge.id)
    if (activationError) throw activationError
    const { data: submission, error: submissionError } = await admin
      .from('submissions')
      .insert({
        challenge_id: challenge.id,
        challenge_habit_id: attachment.id,
        submitter_id: participantId,
        note: 'Registro sintético com evidência privada',
      })
      .select()
      .single()
    if (submissionError) throw submissionError

    evidencePath = `${submission.id}/e2e.jpg`
    const jpeg = Uint8Array.from(
      Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==', 'base64'),
    )
    const { error: uploadError } = await admin.storage
      .from('evidence')
      .upload(evidencePath, jpeg, { contentType: 'image/jpeg' })
    if (uploadError) throw uploadError
    const { error: evidenceError } = await admin.from('evidence').insert({
      submission_id: submission.id,
      storage_bucket: 'evidence',
      storage_path: evidencePath,
      media_type: 'image/jpeg',
      size_bytes: jpeg.byteLength,
    })
    if (evidenceError) throw evidenceError

    await page.goto('/entrar')
    await page.getByLabel('E-mail').fill(firstReviewerEmail)
    await page
      .getByRole('textbox', { name: 'Senha', exact: true })
      .fill(password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto(`/desafio/${challenge.id}/revisoes/${submission.id}`)
    await expect(page.getByAltText(/Foto enviada/)).toBeVisible()
    await page
      .getByLabel('Comentário do voto')
      .fill('Evidência válida no teste E2E.')
    await page.getByRole('button', { name: 'Confirmar voto' }).click()
    await expect(page).toHaveURL(new RegExp(`/desafio/${challenge.id}/ranking`))
    await expect(page.getByText('10 pts')).not.toBeVisible()

    const { error: signInError } = await secondReviewer.auth.signInWithPassword(
      {
        email: secondReviewerEmail,
        password,
      },
    )
    if (signInError) throw signInError
    const { error: secondVoteError } = await secondReviewer.rpc(
      'vote_submission',
      {
        p_submission_id: submission.id,
        p_decision: 'approved',
        p_reason: 'Segundo voto confirma a evidência.',
      },
    )
    if (secondVoteError) throw secondVoteError

    await page.reload()
    await expect(page.getByText('Pessoa Participante')).toBeVisible()
    await expect(page.getByText('10 pts')).toBeVisible()
    const { count, error: ledgerError } = await admin
      .from('point_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('submission_id', submission.id)
      .eq('kind', 'award')
    if (ledgerError) throw ledgerError
    expect(count).toBe(1)
  } finally {
    if (evidencePath)
      await admin.storage.from('evidence').remove([evidencePath])
    if (groupId) await admin.from('groups').delete().eq('id', groupId)
    for (const userId of createdUsers.reverse())
      await admin.auth.admin.deleteUser(userId)
  }
})
