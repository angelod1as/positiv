import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { Database } from "~types/database/database.types"
import type { DBClient } from "~types/utils/utils.types"

export function createBrowserClient(): { supabase: DBClient } {
  return {
    supabase: createSupabaseBrowserClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    ),
  }
}
