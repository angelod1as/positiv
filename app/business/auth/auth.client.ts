import type { SupabaseClient } from "@supabase/supabase-js"
import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { createBrowserClient } from "~/lib/supabase/client"
import { handleAuthError } from "~/lib/supabase/handle-auth-error"
import type { Database } from "~types/database.types"
import { currentProfileSchema, currentUserSchema } from "../common"

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
    return await handleAuthError(authError, supabase)
  }

  if (!authData.user) {
    return errorProps
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
