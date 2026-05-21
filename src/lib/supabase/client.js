import { createBrowserClient } from '@supabase/ssr'

let client = null

export function createClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a no-op client during build/SSG when env vars aren't available
    return {
      auth: {
        getUser: async () => ({ data: { user: null } }),
        signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
        signUp: async () => ({ error: new Error('Supabase not configured') }),
        signOut: async () => ({}),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        exchangeCodeForSession: async () => ({ error: new Error('Supabase not configured') }),
      },
      from: () => ({
        select: () => ({ order: () => ({ data: [], error: null }), eq: () => ({ single: () => ({ data: null, error: null }) }), data: [], error: null }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }), data: null, error: null }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        delete: () => ({ eq: () => ({ data: null, error: null }) }),
      }),
    }
  }

  client = createBrowserClient(url, key, {
    auth: {
      lock: async (name, acquireTimeout, fn) => fn(),
    },
  })
  return client
}
