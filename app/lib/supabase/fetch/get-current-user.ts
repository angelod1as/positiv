import type { User } from "@supabase/supabase-js"
import type { DBClient } from "~types/utils.types"

type GetCurrentUser = (supabase: DBClient) => Promise<User | undefined>
export const getCurrentUser: GetCurrentUser = async (supabase) => {
  const {
    error,
    data: { user },
  } = await supabase.auth.getUser()

  if (error) {
    if (error.message.includes("Auth session missing!")) {
      return undefined
    }
    console.error("Auth error", error)
    // TODO: Show error toast
    return undefined
  }

  if (!user) return undefined
  return user
}
