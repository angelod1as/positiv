import {
  createServerClient as createSupabaseServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr"
import { type EmailOtpType } from "@supabase/supabase-js"
import { redirect, type LoaderFunctionArgs } from "react-router"
import type { Database } from "~types/database/database.types"

const { VITE_SUPABASE_URL = "", VITE_SUPABASE_ANON_KEY = "" } = import.meta.env

export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const next = requestUrl.searchParams.get("next") || "/"
  const headers = new Headers()

  if (token_hash && type) {
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

    if (!error) {
      return redirect(next, { headers })
    }
  }
  // return the user to an error page with instructions
  throw new Error("You must have a code to access this page")
}
