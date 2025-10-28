import {
  createServerClient as createSupabaseServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr"
import { type EmailOtpType } from "@supabase/supabase-js"
import { type LoaderFunctionArgs } from "react-router"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import paths from "~/lib/paths"
import type { Database } from "~types/database/database.types"

const { VITE_SUPABASE_URL = "", VITE_SUPABASE_ANON_KEY = "" } = import.meta.env

const {
  auth: { LOGIN },
} = paths

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
      const successMessage =
        type === "recovery"
          ? "Senha redefinida com sucesso!"
          : "E-mail confirmado com sucesso!"

      return redirectWithSuccess(next, successMessage, { headers })
    }

    if (
      error.message.includes("Token has expired") ||
      error.message.includes("invalid") ||
      error.code === "otp_expired"
    ) {
      throw await redirectWithError(
        LOGIN,
        "Link já utilizado ou expirado. Tente fazer login ou solicite um novo link.",
      )
    }

    throw await redirectWithError(
      LOGIN,
      `Erro ao confirmar: ${error.message || "link inválido"}`,
    )
  }

  throw await redirectWithError(
    LOGIN,
    "Link inválido. Por favor, verifique o link no seu e-mail.",
  )
}
