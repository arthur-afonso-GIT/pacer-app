export interface ActivityConsistency {
  currentStreak: number
  bestStreak: number
  activeDays: number
  heatmap: Array<{ date: string; count: number }>
}

const shiftCivilDate = (date: string, days: number) => {
  const instant = new Date(`${date}T12:00:00Z`)
  instant.setUTCDate(instant.getUTCDate() + days)
  return instant.toISOString().slice(0, 10)
}

export const currentDateInTimezone = (timezone: string, now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

export function deriveActivityConsistency(
  occurredDates: readonly string[],
  today: string,
): ActivityConsistency {
  const counts = new Map<string, number>()
  for (const date of occurredDates)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  const dates = [...counts.keys()].sort()

  let bestStreak = 0
  let running = 0
  let previous: string | undefined
  for (const date of dates) {
    running = previous && shiftCivilDate(previous, 1) === date ? running + 1 : 1
    bestStreak = Math.max(bestStreak, running)
    previous = date
  }

  let cursor = counts.has(today) ? today : shiftCivilDate(today, -1)
  let currentStreak = 0
  while (counts.has(cursor)) {
    currentStreak += 1
    cursor = shiftCivilDate(cursor, -1)
  }

  return {
    currentStreak,
    bestStreak,
    activeDays: dates.length,
    heatmap: Array.from({ length: 28 }, (_, index) => {
      const date = shiftCivilDate(today, index - 27)
      return { date, count: counts.get(date) ?? 0 }
    }),
  }
}
