import type { SupabaseClient } from "@supabase/supabase-js"
import { redirectWithError } from "remix-toast"
import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import paths from "~/lib/paths"
import { createBrowserClient } from "~/lib/supabase/client"
import type { Database } from "~types/database/database.types"
import { currentProfileSchema, currentUserSchema } from "../common"

const {
  dash: { DASHBOARD },
} = paths

export const clientContextSchema = zod.object({
  supabase: zod.custom<SupabaseClient<Database, "public">>(),
  currentUser: currentUserSchema.nullable(),
  currentProfile: currentProfileSchema.nullable(),
})

export const getClientContext = async (): Promise<
  z.infer<typeof clientContextSchema>
> => {
  const { supabase } = createBrowserClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  const errorProps = {
    supabase,
    currentUser: null,
    currentProfile: null,
  }

  if (authError) {
    if (!authError.message.includes("Auth session missing!")) {
      console.error("AUTH error", errorProps)
      throw await redirectWithError(
        DASHBOARD,
        "Houve um erro com sua autenticação, tente novamente mais tarde",
      )
    }
  }

  if (!authData.user) {
    return {
      ...errorProps,
      currentUser: null,
      currentProfile: null,
    }
  }

  const { id: userId, email } = authData.user
  const currentUser = { id: userId, email }

  const { data: profileData, error: profileError } = await supabase
    .rpc("get_profile_with_roles", { user_id_input: userId })
    .single()

  if (profileError) {
    if (profileError.details !== "The result contains 0 rows") {
      console.error("getCurrentProfile", profileError)
    }

    return {
      ...errorProps,
      currentUser,
      currentProfile: null,
    }
  }

  if (!profileData) {
    return {
      ...errorProps,
      currentUser,
      currentProfile: null,
    }
  }

  const currentProfile = profileData

  return {
    supabase,
    currentProfile,
    currentUser,
  }
}
