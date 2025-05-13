import { applySchema } from "composable-functions"
import { redirect, type Params } from "react-router"
import type { z } from "zod"
import { isProd } from "~/lib/helpers/is-prod.server"
import paths from "~/lib/paths"
import { createServerClient } from "~/lib/supabase/server"
import {
  contextSchema,
  currentUserSchema,
  forgotPasswordSchema,
  loginSchema,
} from "../common"

const {
  root: { HOME },
  auth: { LOGIN, LOGON_CALLBACK },
  dash: {
    account: { CHANGE_PASSWORD },
  },
} = paths

export const getContext = async (
  request: Request,
  _params: Params,
): Promise<z.infer<typeof contextSchema>> => {
  const host = request.headers.get("host")
  const { supabase, headers: supabaseHeaders } = createServerClient(request)
  const { data: authData, error: authError } = await supabase.auth.getUser()

  const errorProps = {
    supabase,
    supabaseHeaders,
    currentUser: null,
    currentProfile: null,
    host,
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

  const prod = isProd()

  return {
    supabase,
    supabaseHeaders,
    currentProfile: profileData,
    currentUser: {
      id: userId,
    },
    isProd: prod,
    host,
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

export const loginUser = applySchema(
  loginSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase } = context
  const { error, data } = await supabase.auth.signInWithPassword(values)

  if (error) {
    if (error.code === "invalid_credentials") {
      throw new Error("Credenciais inválidas")
    }
    throw new Error(
      `Erro de autenticação — Código: "${error.code}" — Mensagem: "${error.message}"`,
    )
  }

  return { user: data.user }
})

export const forgotPassword = applySchema(
  forgotPasswordSchema,
  contextSchema,
)(async (values, context) => {
  const { email } = values
  const { supabase, host } = context

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${host}${LOGON_CALLBACK}?redirect_to=${CHANGE_PASSWORD}`,
  })

  if (error) {
    console.error("Password Reset Error", error)
    throw new Error(
      "Algo deu errado com sua requisição, contate o administrador",
    )
  }

  return { success: true }
})
