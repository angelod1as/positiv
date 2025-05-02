import { redirect } from "react-router"
import paths from "~/lib/paths"
import { createClient } from "~/lib/supabase/server"

const {
  auth: { LOGIN },
} = paths

export const requireUser = async (request: Request) => {
  const { supabase } = createClient(request)

  const { data } = await supabase.auth.getUser()
  // TODO: remove consoles
  console.info(`\n\n:DEV data:\n`, data, `\n\n`)
  if (!data.user) {
    console.info("NO USER!")
    throw redirect(LOGIN)
  }

  return { user: data.user }
}
