import { redirect } from "react-router"
import { createClient } from "~/lib/supabase/server"

export const requireUser = async (request: Request) => {
  const { supabase } = createClient(request)

  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    throw redirect("/login")
  }

  return { user: data.user }
}
