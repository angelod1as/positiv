import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import { ENV } from "varlock/env"
import type { Database } from "~types/database/database.types"
import type { DBClient } from "~types/utils/utils.types"

export function createBrowserClient(): { supabase: DBClient } {
  return {
    supabase: createSupabaseBrowserClient<Database>(
      ENV.VITE_SUPABASE_URL,
      ENV.VITE_SUPABASE_ANON_KEY,
    ),
  }
}
