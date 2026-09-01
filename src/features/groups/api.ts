import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/infrastructure/supabase/database.types'

export type Group = Tables<'groups'>
export type Membership = Tables<'group_members'>
export interface GroupMemberView extends Membership {
  displayName: string
  avatarUrl: string | null
}
export interface GroupOverview {
  group: Group
  members: GroupMemberView[]
  challenges: Tables<'challenges'>[]
  feed: GroupFeedPost[]
  leaderboard: GroupLeaderboardEntry[]
}
export type GroupLeaderboardEntry =
  Database['public']['Functions']['get_group_leaderboard']['Returns'][number]
export interface GroupFeedPost {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  name: string
  suggestedPoints: number
  currentPoints: number
  photoUrl: string
  status: string
  approvals: number
  rejections: number
  requiredVotes: number
  matchingProposals: number
  hasVoted: boolean
  proposals: {
    userId: string
    displayName: string
    points: number
    isAuthor: boolean
  }[]
  createdAt: string
}
export interface CreateGroupInput {
  name: string
  description: string
  timezone: string
}
export type UpdateGroupInput = CreateGroupInput & { groupId: string }
export interface CreateInviteInput {
  groupId: string
  email?: string
  role: 'member' | 'admin'
  expiresInDays: number
}

type InviteRpcClient = {
  rpc(
    name: 'create_group_invite',
    args: {
      p_group_id: string
      p_email: string | null
      p_role: 'member' | 'admin'
      p_expires_in: string
    },
  ): PromiseLike<{ data: string | null; error: { message: string } | null }>
  rpc(
    name: 'accept_group_invite',
    args: { p_token: string },
  ): PromiseLike<{ data: string | null; error: { message: string } | null }>
}
const result = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('Resposta vazia do servidor')
  return data
}

export const createGroupsRepository = (client: SupabaseClient<Database>) => ({
  async list(): Promise<Group[]> {
    const { data, error } = await client.rpc('get_my_groups')
    if (error) throw error
    return data
  },
  async create(input: CreateGroupInput): Promise<Group> {
    const { data, error } = await client.rpc('create_group', {
      p_name: input.name,
      p_description: input.description || '',
      p_timezone: input.timezone,
    })
    return result(data, error)
  },
  async overview(groupId: string): Promise<GroupOverview> {
    const [group, members, challenges, feed, leaderboard] = await Promise.all([
      client.from('groups').select('*').eq('id', groupId).single(),
      client
        .from('group_members')
        .select('*, profiles(display_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('status', 'active'),
      client
        .from('challenges')
        .select('*')
        .eq('group_id', groupId)
        .order('starts_at'),
      client.rpc('get_group_feed', { p_group_id: groupId }),
      client.rpc('get_group_leaderboard', { p_group_id: groupId }),
    ])
    if (group.error) throw group.error
    if (members.error) throw members.error
    if (challenges.error) throw challenges.error
    if (feed.error) throw feed.error
    if (leaderboard.error) throw leaderboard.error
    const feedWithUrls = await Promise.all(
      feed.data.map(async (post) => {
        const signed = await client.storage
          .from('activity-posts')
          .createSignedUrl(post.photo_path, 900)
        return {
          id: post.post_id,
          authorId: post.author_id,
          authorName: post.author_name,
          authorAvatarUrl: post.author_avatar_url,
          name: post.activity_name,
          suggestedPoints: post.suggested_points,
          currentPoints: post.current_points,
          photoUrl: signed.data?.signedUrl ?? '',
          status: post.status,
          approvals: post.approvals,
          rejections: post.rejections,
          requiredVotes: post.required_votes,
          matchingProposals: post.matching_proposals,
          hasVoted: post.has_voted,
          proposals: Array.isArray(post.proposals)
            ? post.proposals.flatMap((proposal) => {
                if (
                  !proposal ||
                  typeof proposal !== 'object' ||
                  Array.isArray(proposal)
                )
                  return []
                const value = proposal as Record<string, unknown>
                return typeof value.user_id === 'string' &&
                  typeof value.display_name === 'string' &&
                  typeof value.points === 'number'
                  ? [
                      {
                        userId: value.user_id,
                        displayName: value.display_name,
                        points: value.points,
                        isAuthor: value.is_author === true,
                      },
                    ]
                  : []
              })
            : [],
          createdAt: post.created_at,
        }
      }),
    )
    return {
      group: group.data,
      members: members.data.map((member) => ({
        group_id: member.group_id,
        user_id: member.user_id,
        role: member.role,
        status: member.status,
        joined_at: member.joined_at,
        left_at: member.left_at,
        displayName: member.profiles.display_name,
        avatarUrl: member.profiles.avatar_url,
      })),
      challenges: challenges.data,
      feed: feedWithUrls,
      leaderboard: leaderboard.data,
    }
  },
  async createInvite(input: CreateInviteInput): Promise<string> {
    const rpc = client as unknown as InviteRpcClient
    const { data, error } = await rpc.rpc('create_group_invite', {
      p_group_id: input.groupId,
      p_email: input.email || null,
      p_role: input.role,
      p_expires_in: `${input.expiresInDays} days`,
    })
    return result(data, error)
  },
  async joinByCode(code: string): Promise<string> {
    const rpc = client as unknown as InviteRpcClient
    const { data, error } = await rpc.rpc('accept_group_invite', {
      p_token: code.trim(),
    })
    return result(data, error)
  },
  async setMemberRole(
    groupId: string,
    userId: string,
    role: 'member' | 'admin',
  ) {
    const { data, error } = await client.rpc('manage_group_member', {
      p_group_id: groupId,
      p_user_id: userId,
      p_action: 'set_role',
      p_role: role,
    })
    return result(data, error)
  },
  async removeMember(groupId: string, userId: string) {
    const { data, error } = await client.rpc('manage_group_member', {
      p_group_id: groupId,
      p_user_id: userId,
      p_action: 'remove',
      p_role: null,
    })
    return result(data, error)
  },
  async updateGroup(input: UpdateGroupInput): Promise<Group> {
    const { data, error } = await client.rpc('update_group_settings', {
      p_group_id: input.groupId,
      p_name: input.name,
      p_description: input.description,
      p_timezone: input.timezone,
    })
    return result(data, error)
  },
  async leaveGroup(groupId: string, successorId?: string) {
    const { data, error } = await client.rpc('leave_group', {
      p_group_id: groupId,
      p_successor_id: successorId || null,
    })
    return result(data, error)
  },
  async votePost(
    groupId: string,
    postId: string,
    decision: 'approved' | 'rejected',
  ) {
    const { data, error } = await client.rpc('vote_activity_post', {
      p_group_id: groupId,
      p_post_id: postId,
      p_decision: decision,
    })
    return result(data, error)
  },
  async proposePostPoints(groupId: string, postId: string, points: number) {
    const { data, error } = await client.rpc('propose_activity_points', {
      p_group_id: groupId,
      p_post_id: postId,
      p_points: points,
    })
    return result(data, error)
  },
  async deletePost(postId: string) {
    const { data, error } = await client.rpc('delete_activity_post', {
      p_post_id: postId,
    })
    const photoPath = result(data, error)
    // Database deletion is already committed. Do not report the post as still
    // present if a subsequent Storage cleanup fails.
    try {
      const removed = await client.storage
        .from('activity-posts')
        .remove([photoPath])
      return { photoRemoved: !removed.error }
    } catch {
      return { photoRemoved: false }
    }
  },
})
export type GroupsRepository = ReturnType<typeof createGroupsRepository>
