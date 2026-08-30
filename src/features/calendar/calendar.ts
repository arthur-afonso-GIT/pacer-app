export interface CalendarMonth {
  year: number
  month: number
}

const pad = (value: number) => String(value).padStart(2, '0')

export function currentCalendarMonth(now = new Date()): CalendarMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function shiftCalendarMonth(
  value: CalendarMonth,
  amount: number,
): CalendarMonth {
  const date = new Date(Date.UTC(value.year, value.month - 1 + amount, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

export function calendarMonthRange(value: CalendarMonth) {
  const next = shiftCalendarMonth(value, 1)
  return {
    from: `${value.year}-${pad(value.month)}-01`,
    to: `${next.year}-${pad(next.month)}-01`,
  }
}

export function formatCalendarMonth(value: CalendarMonth) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(value.year, value.month - 1, 1)))
}

export function formatCivilDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)))
}
