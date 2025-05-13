import type { SupabaseClient } from "@supabase/supabase-js"
import { dataWithError } from "remix-toast"
import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { createBrowserClient } from "~/lib/supabase/client"
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
    if (!authError.message.includes("Auth session missing!")) {
      throw await dataWithError(
        errorProps,
        "Houve um erro com sua autenticação, tente novamente mais tarde",
      )
    }
  }

  if (!authData.user) {
    return errorProps
  }

  const userId = authData.user.id

  const { data: profileData, error: profileError } = await supabase
    .rpc("get_profile_with_roles", { user_id_input: userId })
    .single()

  if (profileError) {
    console.error("getCurrentProfile", profileError)
    return errorProps
  }

  if (!profileData) {
    console.error("getCurrentProfile", profileError)
    return errorProps
  }

  return {
    supabase,
    currentProfile: profileData,
    currentUser: {
      id: userId,
    },
  }
}
