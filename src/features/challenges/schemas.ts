import { z } from 'zod'

export const reviewPolicies = [
  'any_other_member',
  'admins_only',
  'selected_reviewers',
] as const
export const challengeSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(1000),
    startsLocal: z.string().min(1, 'Informe o início'),
    endsLocal: z.string().min(1, 'Informe o fim'),
    reviewPolicy: z.enum(reviewPolicies),
  })
  .refine((value) => value.endsLocal > value.startsLocal, {
    path: ['endsLocal'],
    message: 'O fim deve ser posterior ao início',
  })
export const habitSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500),
  points: z.number().int().min(1).max(10000),
  maxSubmissionsPerDay: z.number().int().min(1).max(100),
})

const wallFormatter = (timezone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

const wallParts = (date: Date, formatter: Intl.DateTimeFormat) =>
  Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
export function zonedLocalToIso(local: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!match) throw new Error('Data local inválida')
  const [, year, month, day, hour, minute] = match
  const expected = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  }
  const wallUtc = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
  )
  const formatter = wallFormatter(timezone)
  const matches: number[] = []
  // IANA offsets are bounded by UTC-12/UTC+14. Scanning by minute also
  // supports zones whose offset is not a whole hour.
  for (
    let candidate = wallUtc - 14 * 60 * 60 * 1000;
    candidate <= wallUtc + 12 * 60 * 60 * 1000;
    candidate += 60 * 1000
  ) {
    const shown = wallParts(new Date(candidate), formatter)
    if (
      shown.year === expected.year &&
      shown.month === expected.month &&
      shown.day === expected.day &&
      shown.hour === expected.hour &&
      shown.minute === expected.minute
    )
      matches.push(candidate)
  }
  if (matches.length === 0)
    throw new Error('Este horário não existe no fuso escolhido.')
  if (matches.length > 1)
    throw new Error('Este horário é ambíguo no fuso escolhido.')
  const [instant] = matches
  if (instant === undefined)
    throw new Error('Não foi possível interpretar o fuso horário.')
  return new Date(instant).toISOString()
}
export type ChallengeFormValues = z.infer<typeof challengeSchema>
export type HabitFormValues = z.infer<typeof habitSchema>
