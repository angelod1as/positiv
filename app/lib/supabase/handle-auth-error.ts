import type { AuthError } from "@supabase/supabase-js"
import { redirectWithError } from "remix-toast"
import type { DBClient } from "~types/utils.types"
import paths from "../paths"

const {
  auth: { LOGIN },
} = paths

export const handleAuthError = async (
  authError: AuthError,
  supabase: DBClient,
) => {
  if (authError?.code === "refresh_token_not_found Token Not Found") {
    return {
      currentProfile: null,
      currentUser: null,
      supabase,
    }
  }

  if (!authError.message.includes("Auth session missing!")) {
    return {
      currentProfile: null,
      currentUser: null,
      supabase,
    }
  }
  throw await redirectWithError(
    LOGIN,
    "Houve um erro com sua autenticação, tente novamente mais tarde",
  )
}
