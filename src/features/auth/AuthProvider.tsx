import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/infrastructure/supabase/client'
import type { Database } from '@/infrastructure/supabase/database.types'
import { signOut as signOutRequest } from './api'

type Client = SupabaseClient<Database>
import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({
  children,
  client = supabase,
}: {
  children: ReactNode
  client?: Client | null
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(client))

  useEffect(() => {
    if (!client) return
    let active = true
    void client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setLoading(false)
      }
    })
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next)
        setLoading(false)
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        await signOutRequest(client)
        setSession(null)
      },
    }),
    [client, loading, session],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
