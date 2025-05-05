import { applySchema } from "composable-functions"
import { redirect } from "react-router"
import { z } from "zod"
import paths from "~/lib/paths"
import { userContextSchema } from "../auth.server"

const {
  auth: { LOGIN },
} = paths

export const logoutSchema = z.object({})

export const logoutUser = applySchema(
  logoutSchema,
  userContextSchema,
)(async (_values, context) => {
  const { supabase } = context
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error(error)
    throw new Error(
      `Erro de logout — Código: "${error.code}" — Mensagem: "${error.message}"`,
    )
  }

  return redirect(LOGIN)
})
