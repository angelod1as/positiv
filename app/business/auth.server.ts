import type { SupabaseClient } from "@supabase/supabase-js"
import { redirect, type Params } from "react-router"
import { z, ZodType } from "zod"
import paths from "~/lib/paths"
import { createServerClient } from "~/lib/supabase/server"
import type { Database } from "~types/database.types"
import type { ProfileWithRoles } from "~types/entities.types"

const {
  auth: { LOGIN },
} = paths

const currentUserSchema = z.object({
  id: z.string(),
})

const currentProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  basic_data_filled: z.boolean(),
  social_name: z.string(),
  pronouns: z.array(z.string()),
  rg: z.string(),
  cpf: z.string(),
  phone: z.number(),
  date_of_birth: z.string(),
  gender: z.array(z.string()),
  orientation: z.array(z.string()),
  where_lives: z.string(),
  how_came_to_us: z.string(),
  rg_issuer: z.string(),
  allow_marketing_email: z.boolean(),
  created_at: z.string(),
  is_admin: z.boolean(),
  roles: z.array(z.string()),
}) satisfies ZodType<ProfileWithRoles>

export const contextSchema = z.object({
  supabase: z.custom<SupabaseClient<Database, "public">>(),
  supabaseHeaders: z.custom<Headers>(),
  currentUser: currentUserSchema.nullable(),
  currentProfile: currentProfileSchema.nullable(),
})

export const getContext = async (
  request: Request,
  _params: Params,
): Promise<z.infer<typeof contextSchema>> => {
  const { supabase, headers: supabaseHeaders } = createServerClient(request)
  const { data: authData, error: authError } = await supabase.auth.getUser()

  const errorProps = {
    supabase,
    supabaseHeaders,
    currentUser: null,
    currentProfile: null,
  }

  if (authError) {
    if (!authError.message.includes("Auth session missing!")) {
      // TODO: Show error toast
      return errorProps
    }
  }

  if (!authData.user) {
    // TODO: Show error toast
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
    supabaseHeaders,
    currentProfile: profileData,
    currentUser: {
      id: userId,
    },
  }
}

export const userContextSchema = contextSchema.extend({
  currentUser: currentUserSchema,
})

export const getUserContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof userContextSchema>> => {
  const { currentUser, ...context } = await getContext(request, params)
  if (!currentUser) {
    throw redirect(LOGIN)
  }
  return { ...context, currentUser }
}
