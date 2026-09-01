import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/infrastructure/supabase/database.types'

export type Challenge = Tables<'challenges'>
export type Habit = Tables<'habits'>
export type ChallengeHabit = Tables<'challenge_habits'>
export interface CreateChallengeInput {
  groupId: string
  createdBy: string
  name: string
  description?: string
  startsAt: string
  endsAt: string
  reviewPolicy: Database['public']['Enums']['review_policy']
}
export interface CreateHabitInput {
  challengeId: string
  ownerId: string
  name: string
  description?: string
  points: number
  maxSubmissionsPerDay: number
}
export interface CreatedHabit {
  habit: Habit
  attachment: ChallengeHabit
}
export interface CreateGlobalHabitInput {
  name: string
  points: number
  photo: File
  groupIds: string[]
}
export interface GlobalHabitResult {
  postId: string
}
const required = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Resposta vazia do servidor')
  return data
}

export const createChallengesRepository = (
  client: SupabaseClient<Database>,
) => ({
  async createChallenge(input: CreateChallengeInput): Promise<Challenge> {
    const { data, error } = await client
      .from('challenges')
      .insert({
        group_id: input.groupId,
        created_by: input.createdBy,
        name: input.name,
        description: input.description || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        review_policy: input.reviewPolicy,
      })
      .select()
      .single()
    return required(data, error)
  },
  async createHabit(input: CreateHabitInput): Promise<CreatedHabit> {
    // RLS independently authorizes habit ownership and challenge administration.
    const habitResult = await client
      .from('habits')
      .insert({
        owner_id: input.ownerId,
        name: input.name,
        description: input.description || null,
      })
      .select()
      .single()
    const habit = required(habitResult.data, habitResult.error)
    const attachmentResult = await client
      .from('challenge_habits')
      .insert({
        challenge_id: input.challengeId,
        habit_id: habit.id,
        points: input.points,
        max_submissions_per_day: input.maxSubmissionsPerDay,
      })
      .select()
      .single()
    return {
      habit,
      attachment: required(attachmentResult.data, attachmentResult.error),
    }
  },
  async createGlobalHabit(
    input: CreateGlobalHabitInput,
  ): Promise<GlobalHabitResult> {
    const { data: auth, error: authError } = await client.auth.getUser()
    if (authError) throw authError
    const extension = input.photo.name.split('.').pop()?.toLowerCase() || 'jpg'
    const photoPath = `${auth.user.id}/${crypto.randomUUID()}.${extension}`
    const uploaded = await client.storage
      .from('activity-posts')
      .upload(photoPath, input.photo, { contentType: input.photo.type })
    if (uploaded.error) throw uploaded.error
    const { data, error } = await client.rpc(
      'create_activity_post_for_groups',
      {
        p_name: input.name,
        p_suggested_points: input.points,
        p_photo_path: photoPath,
        p_group_ids: input.groupIds,
      },
    )
    if (error) {
      await client.storage.from('activity-posts').remove([photoPath])
      throw error
    }
    return { postId: data }
  },
  async activateChallenge(challengeId: string): Promise<Challenge> {
    const { data, error } = await client
      .from('challenges')
      .update({ status: 'active' })
      .eq('id', challengeId)
      .eq('status', 'draft')
      .select()
      .single()
    return required(data, error)
  },
})
export type ChallengesRepository = ReturnType<typeof createChallengesRepository>
