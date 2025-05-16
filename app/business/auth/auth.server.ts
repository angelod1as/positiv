import { applySchema } from "composable-functions"
import { redirect, type Params } from "react-router"
import {
  dataWithError,
  redirectWithError,
  redirectWithSuccess,
} from "remix-toast"
import type { z } from "zod"
import { isProd } from "~/lib/helpers/is-prod.server"
import paths from "~/lib/paths"
import { createServerClient } from "~/lib/supabase/server"
import {
  changePasswordSchema,
  contextSchema,
  forgotPasswordSchema,
  getSupabaseSchema,
  loginSchema,
  registerUserSchema,
  userContextSchema,
} from "../common"

const {
  root: { HOME },
  auth: { LOGIN, LOGON_CALLBACK },
  dash: {
    account: { CHANGE_PASSWORD },
  },
} = paths

export const getSupabase = async (
  request: Request,
  _params: Params,
): Promise<z.infer<typeof getSupabaseSchema>> => {
  const { supabase, headers: supabaseHeaders } = createServerClient(request)
  return { supabaseHeaders, supabase }
}

export const getContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof contextSchema>> => {
  const { supabase, supabaseHeaders } = await getSupabase(request, params)
  const host = request.headers.get("host")

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

export const getUserContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof userContextSchema>> => {
  const { currentUser, ...context } = await getContext(request, params)
  if (!currentUser) {
    throw await redirectWithError(
      LOGIN,
      "Você precisa estar logade para continuar",
    )
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

export const getUserCodeContext = async (request: Request, params: Params) => {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  if (!code) {
    throw await redirectWithError(
      HOME,
      "O link não continha o código necessário para mudar sua senha",
    )
  }

  const { supabase, supabaseHeaders } = await getSupabase(request, params)

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    if (error.code === "invalid_credentials") {
      throw new Error("Credenciais inválidas")
    }
    throw new Error(
      `Erro de autenticação — Código: "${error.code}" — Mensagem: "${error.message}"`,
    )
  }

  return redirect(CHANGE_PASSWORD, { headers: supabaseHeaders })
}

export const forgotPassword = applySchema(
  forgotPasswordSchema,
  contextSchema,
)(async (values, context) => {
  const { email } = values
  const { supabase, host } = context

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${host}auth/confirm`,
  })

  if (error) {
    console.error("Password Reset Error", error)
    throw new Error(
      "Algo deu errado com sua requisição, contate o administrador",
    )
  }

  return { success: true }
})

// Not a applySchema purposefully
export const logoutUser = async (context: z.infer<typeof contextSchema>) => {
  const { supabase } = context
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error(error)
    throw new Error(
      `Erro de logout — Código: "${error.code}" — Mensagem: "${error.message}"`,
    )
  }

  return redirectWithSuccess(HOME, "Você deslogou com sucesso")
}

export const changePassword = applySchema(
  changePasswordSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase } = context
  const { error } = await supabase.auth.updateUser({
    password: values.password,
  })

  if (error) {
    if (error.code === "same_password") {
      throw new Error("Será que essa não era a sua senha? Tente outra.")
    }
    console.error(error)
    throw new Error(
      "Não conseguimos resetar sua senha. Entre em contato com o administrador",
    )
  }

  return {}
})

export const registerUser = applySchema(
  registerUserSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, host } = context

  const { over18, confirmPassword, ...data } = values

  const { error } = await supabase.auth.signUp({
    ...data,
    options: {
      emailRedirectTo: `${host}/${LOGON_CALLBACK}`,
    },
  })

  if (error) {
    throw new Error(`Ops, ocorreu um erro. Erro: ${error}`)
  }

  return values
})
