import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "~types/database.types"
import type { DBClient } from "~types/utils.types"

export function createClient(): { supabase: DBClient } {
  return {
    supabase: createBrowserClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    ),
  }
}
