import {
  createServerClient as createSupabaseServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr"
import { type EmailOtpType } from "@supabase/supabase-js"
import { ENV } from "varlock/env"
import type { Database } from "~types/database/database.types"

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = ENV

export async function verifyEmailOtp({
  request,
  headers,
  type,
  token_hash,
}: {
  request: Request
  headers: Headers
  type: EmailOtpType
  token_hash: string
}) {
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

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  })

  return { error }
}
