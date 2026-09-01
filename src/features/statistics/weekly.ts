export interface WeeklyConsistency {
  groupId: string
  groupName: string
  timezone: string
  weekStart: string
  weekEnd: string
  activeDays: number
  approvedActivities: number
  netPoints: number
  currentStreak: number
}

export type ConsistencyMilestone = 'start' | 'rhythm' | 'consistent'

export const getConsistencyMilestone = (
  activeDays: number,
): ConsistencyMilestone | undefined => {
  if (activeDays >= 3) return 'consistent'
  if (activeDays === 2) return 'rhythm'
  if (activeDays === 1) return 'start'
  return undefined
}
