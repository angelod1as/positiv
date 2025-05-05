import type { SupabaseClient } from "@supabase/supabase-js"
import { applySchema } from "composable-functions"
import { type Params } from "react-router"
import { z } from "zod"
import { createServerClient } from "~/lib/supabase/server"
import type { Database } from "~types/database.types"
import { loginSchema } from "./auth.common"

/** Extension of User with more data, so, called Profile */
export type ProfileWithRoles =
  Database["public"]["Functions"]["get_profile_with_roles"]["Returns"][0]

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

const currentUserSchema = z.object({
  id: z.string(),
  // ...
})

const currentProfileSchema = z.object({
  id: z.string(),
})

const contextSchema = z.object({
  supabase: z.custom<SupabaseClient<Database, "public">>(),
  headers: z.custom<Headers>(),
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
    headers: supabaseHeaders,
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

  const { data: profileData, error: profileError } = await supabase
    .rpc("get_profile_with_roles", { user_id_input: authData.user.id })
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
    headers: supabaseHeaders,
    currentProfile: profileData,
    currentUser: authData.user,
  }
}

// const userContextSchema = contextSchema.extend({
//   currentUser: currentUserSchema,
// })

// export const getUserContext = async (
//   request: Request,
//   params: Params,
// ): Promise<z.infer<typeof userContextSchema>> => {
//   const { currentUser, ...context } = await getContext(request, params)
//   if (!currentUser) {
//     throw redirect("LOGIN") // TODO: route
//   }
//   return { ...context, currentUser }
// }

export const loginUser = applySchema(
  loginSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase } = context
  const { error, data } = await supabase.auth.signInWithPassword(values)

  if (error) {
    if (error.code === "invalid_credentials") {
      console.error("Credenciais inválidas")
      throw new Error("Credenciais inválidas")
    }
    console.error("Credenciais inválidas")
    throw new Error(
      `Erro de autenticação — Código: "${error.code}" — Mensagem: "${error.message}"`,
    )
  }

  return { user: data.user }
})
