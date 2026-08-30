import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import type { Database } from '../src/infrastructure/supabase/database.types'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

test('a second member reviews an activity and the ledger updates the ranking', async ({
  page,
}) => {
  test.skip(
    !url || !serviceKey,
    'Requires a disposable local Supabase instance',
  )
  if (!url || !serviceKey) return
  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
  const suffix = crypto.randomUUID()
  const password = 'Pacer-test-2026!'
  const participantEmail = `participant-${suffix}@example.test`
  const reviewerEmail = `reviewer-${suffix}@example.test`
  const createdUsers: string[] = []

  try {
    for (const [email, displayName] of [
      [participantEmail, 'Pessoa Participante'],
      [reviewerEmail, 'Pessoa Revisora'],
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
    const [participantId, reviewerId] = createdUsers as [string, string]
    const { data: group, error: groupError } = await admin
      .from('groups')
      .insert({
        name: 'Grupo E2E',
        timezone: 'America/Fortaleza',
        created_by: reviewerId,
      })
      .select()
      .single()
    if (groupError) throw groupError
    const { error: memberError } = await admin.from('group_members').insert([
      {
        group_id: group.id,
        user_id: reviewerId,
        role: 'owner',
        status: 'active',
      },
      {
        group_id: group.id,
        user_id: participantId,
        role: 'member',
        status: 'active',
      },
    ])
    if (memberError) throw memberError
    const { data: challenge, error: challengeError } = await admin
      .from('challenges')
      .insert({
        group_id: group.id,
        created_by: reviewerId,
        name: 'Desafio E2E',
        status: 'active',
        review_policy: 'any_other_member',
        starts_at: new Date(Date.now() - 86_400_000).toISOString(),
        ends_at: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .select()
      .single()
    if (challengeError) throw challengeError
    const { data: habit, error: habitError } = await admin
      .from('habits')
      .insert({ owner_id: reviewerId, name: 'Caminhada E2E' })
      .select()
      .single()
    if (habitError) throw habitError
    const { data: attachment, error: attachmentError } = await admin
      .from('challenge_habits')
      .insert({ challenge_id: challenge.id, habit_id: habit.id, points: 10 })
      .select()
      .single()
    if (attachmentError) throw attachmentError
    const { data: submission, error: submissionError } = await admin
      .from('submissions')
      .insert({
        challenge_id: challenge.id,
        challenge_habit_id: attachment.id,
        submitter_id: participantId,
        note: 'Registro sintético para revisão',
      })
      .select()
      .single()
    if (submissionError) throw submissionError

    await page.goto('/entrar')
    await page.getByLabel('E-mail').fill(reviewerEmail)
    await page.getByLabel('Senha').fill(password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.goto(`/desafio/${challenge.id}/revisoes/${submission.id}`)
    await page.getByLabel('Pontos aprovados').fill('10')
    await page.getByLabel('Motivo').fill('Atividade válida no teste E2E.')
    await page.getByRole('button', { name: 'Confirmar decisão' }).click()

    await expect(page).toHaveURL(new RegExp(`/desafio/${challenge.id}/ranking`))
    await expect(page.getByText('Pessoa Participante')).toBeVisible()
    await expect(page.getByText('10 pts')).toBeVisible()
  } finally {
    for (const userId of createdUsers.reverse()) {
      await admin.auth.admin.deleteUser(userId)
    }
  }
})
