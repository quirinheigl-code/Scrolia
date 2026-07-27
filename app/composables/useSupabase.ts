import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Module-scoped (not inside the composable function), so this genuinely
// persists as a singleton across every call, unlike component-local state.
let client: SupabaseClient | null = null

export function useSupabase(): SupabaseClient {
  if (client) return client
  const config = useRuntimeConfig()
  client = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
  return client
}
