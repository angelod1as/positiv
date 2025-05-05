import { applySchema } from "composable-functions"
import { z } from "zod"

import { createServerClient } from "~/lib/supabase/server"

const contextSchema = z.custom<{ request: Request }>()

export const mutation = applySchema(
  schema,
  contextSchema,
)(async (values, context) => {
  const { request } = context
  const { supabase, headers } = createServerClient(request)
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

  return { user: data.user, headers }
})
