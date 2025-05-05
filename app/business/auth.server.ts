import type { SupabaseClient } from "@supabase/supabase-js"
import { applySchema } from "composable-functions"
import { redirect, type Params } from "react-router"
import { z } from "zod"
import { createServerClient } from "~/lib/supabase/server"
import type { Database } from "~types/database.types"
import { loginSchema } from "./auth.common"

export const getContext = async (request: Request, params: Params) => {
  const { supabase, headers } = createServerClient(request)
  const { data } = await supabase.auth.getUser()

  return { supabase, supabaseHeaders: headers, currentUser: data.user }
}

export const getUserContext = async (request: Request, params: Params) => {
  const { currentUser, ...context } = await getContext(request, params)
  if (!currentUser) {
    throw redirect("LOGIN") // TODO: route
  }
  return { ...context, currentUser }
}

const currentUserSchema = z.object({
  id: z.string(),
  // ...
})

const contextSchema = z.object({
  supabase: z.custom<SupabaseClient<Database, "public">>(),
  headers: z.custom<Headers>(),
  currentUser: currentUserSchema.nullable(),
})

const userContextSchema = contextSchema.extend({
  currentUser: currentUserSchema,
})

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
