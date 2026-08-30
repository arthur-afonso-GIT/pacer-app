import { z } from 'zod'

const optionalEnvironmentValue = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional())

const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: optionalEnvironmentValue(z.url()),
  VITE_SUPABASE_ANON_KEY: optionalEnvironmentValue(z.string().min(1)),
})

export const publicEnv = publicEnvSchema.parse(import.meta.env)
export const isSupabaseConfigured = Boolean(
  publicEnv.VITE_SUPABASE_URL && publicEnv.VITE_SUPABASE_ANON_KEY,
)
