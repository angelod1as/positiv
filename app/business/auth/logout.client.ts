import { redirect } from "react-router"
import type { z } from "zod"
import paths from "~/lib/paths"
import { clientContextSchema } from "./auth.client"

const {
  auth: { LOGIN },
} = paths

type Context = z.infer<typeof clientContextSchema>

/* Needs to be called client-side */
export const logoutUser = async (context: Context) => {
  const { supabase } = context
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error(error)
    throw new Error(
      `Erro de logout — Código: "${error.code}" — Mensagem: "${error.message}"`,
    )
  }

  return redirect(LOGIN)
}
