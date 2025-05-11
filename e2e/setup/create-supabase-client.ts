import { createClient } from "@supabase/supabase-js"
import { env } from "~/env.server"
import type { Database } from "~types/database.types"

export const createSupabaseTestClient = async () => {
  const { viteSupabaseUrl, supabaseServiceRoleKey } = env()
  if (!viteSupabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Environment variables not set")
  }

  return createClient<Database>(
    viteSupabaseUrl,
    supabaseServiceRoleKey, // Use the SERVICE_ROLE_KEY, NOT the anon key
  )
}
