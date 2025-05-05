import { applySchema } from "composable-functions"
import { z } from "zod"
import { userContextSchema } from "../auth.server"

export const logoutSchema = z.object({})

export const logoutUser = applySchema(
  logoutSchema,
  userContextSchema,
)(async (_values, context) => {
  const { supabase } = context
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(
      `Erro de logout — Código: "${error.code}" — Mensagem: "${error.message}"`,
    )
  }

  return null
})
