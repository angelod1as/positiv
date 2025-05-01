import { type ActionFunctionArgs, redirect } from "react-router"
import { createClient } from "~/lib/supabase/server"

export const action = async ({ request }: ActionFunctionArgs) => {
  const headersToSet = new Headers()
  const { supabase, headers } = createClient(request, headersToSet)
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  return redirect("/entrar", {
    headers,
  })
}

// TODO: Turn this into the Account page
const Logout = () => {
  return (
    <form method="POST">
      <button>logout</button>
    </form>
  )
}

export default Logout
