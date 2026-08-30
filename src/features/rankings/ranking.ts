export type RankingPeriod = 'day' | 'week' | 'month' | 'challenge'

export interface RankingMember {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export interface LedgerAmount {
  userId: string
  points: number
}

export interface RankingEntry extends RankingMember {
  points: number
  rank: number
}

export function aggregateRanking(
  members: readonly RankingMember[],
  ledger: readonly LedgerAmount[],
): RankingEntry[] {
  const totals = new Map<string, number>()
  for (const row of ledger) {
    totals.set(row.userId, (totals.get(row.userId) ?? 0) + row.points)
  }

  const sorted = members
    .map((member) => ({ ...member, points: totals.get(member.userId) ?? 0 }))
    .sort(
      (left, right) =>
        right.points - left.points ||
        left.displayName.localeCompare(right.displayName, 'pt-BR'),
    )

  return sorted.map((entry, index) => ({
    ...entry,
    rank:
      index > 0 && sorted[index - 1]?.points === entry.points
        ? sorted
            .slice(0, index)
            .findIndex((item) => item.points === entry.points) + 1
        : index + 1,
  }))
}

interface WallDate {
  year: number
  month: number
  day: number
}

const wallFormatter = (timezone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

function partsAt(instant: Date, timezone: string) {
  const parts = Object.fromEntries(
    wallFormatter(timezone)
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
  return parts as Record<
    'year' | 'month' | 'day' | 'hour' | 'minute' | 'second',
    number
  >
}

function wallMidnightToInstant(date: WallDate, timezone: string): Date {
  const desired = Date.UTC(date.year, date.month - 1, date.day)
  let candidate = desired
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = partsAt(new Date(candidate), timezone)
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    )
    candidate += desired - represented
  }
  return new Date(candidate)
}

function shiftWallDate(date: WallDate, days: number): WallDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

export function getPeriodRange(
  period: RankingPeriod,
  timezone: string,
  now = new Date(),
): { from: string; to: string } | null {
  if (period === 'challenge') return null
  const current = partsAt(now, timezone)
  let start: WallDate = {
    year: current.year,
    month: current.month,
    day: current.day,
  }
  let end: WallDate

  if (period === 'day') {
    end = shiftWallDate(start, 1)
  } else if (period === 'week') {
    const weekday = new Date(
      Date.UTC(start.year, start.month - 1, start.day),
    ).getUTCDay()
    start = shiftWallDate(start, -((weekday + 6) % 7))
    end = shiftWallDate(start, 7)
  } else {
    start = { year: start.year, month: start.month, day: 1 }
    end =
      start.month === 12
        ? { year: start.year + 1, month: 1, day: 1 }
        : { year: start.year, month: start.month + 1, day: 1 }
  }

  return {
    from: wallMidnightToInstant(start, timezone).toISOString(),
    to: wallMidnightToInstant(end, timezone).toISOString(),
  }
}
