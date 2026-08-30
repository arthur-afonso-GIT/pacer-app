export type GroupRole = 'owner' | 'admin' | 'member'
export type ReviewPolicy =
  'any_other_member' | 'admins_only' | 'selected_reviewers'
export type SubmissionStatus =
  'pending' | 'approved' | 'rejected' | 'cancelled' | 'disputed'
export type ReviewDecision = 'approved' | 'rejected' | 'cancelled' | 'disputed'

export interface PeriodRankingEntry {
  userId: string
  displayName: string
  points: number
  rank: number
}
