import { applySchema } from "composable-functions"
import { contextSchema, loginSchema } from "../common"

// LoginSchema in common.ts
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
