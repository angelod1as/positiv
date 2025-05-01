import { redirect } from "react-router"
import paths from "~/lib/paths"
import { createClient } from "~/lib/supabase/server"

const {
  auth: { LOGIN },
} = paths

export const requireUser = async (request: Request) => {
  const headersToSet = new Headers()
  const { supabase } = createClient(request, headersToSet)

  const { data } = await supabase.auth.getUser()
  console.log(`\n\n:DEV data:\n`, data, `\n\n`)
  if (!data.user) {
    console.log("NO USER!")
    throw redirect(LOGIN)
  }

  return { user: data.user }
}
