import {
  createServerClient as createSupabaseServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr"
import type { Database } from "~types/database/database.types"
import type { DBClient } from "~types/utils/utils.types"

const { VITE_SUPABASE_URL = "", VITE_SUPABASE_ANON_KEY = "" } = import.meta.env

export function createServerClient(request: Request): {
  supabase: DBClient
  headers: Headers
} {
  const headers = new Headers()

  const supabase = createSupabaseServerClient<Database>(
    VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "") as {
            name: string
            value: string
          }[]
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options),
            ),
          )
        },
      },
    },
  )

  return { supabase, headers }
}
