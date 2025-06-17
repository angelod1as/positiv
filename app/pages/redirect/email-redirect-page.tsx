import { redirect } from "react-router"
import type { Route } from "./+types/email-redirect-page"

const EMAIL_REDIRECT_URL = "https://forms.gle/bbjCYphZk3maCgHw5"

export async function loader({}: Route.LoaderArgs) {
  return redirect(EMAIL_REDIRECT_URL)
}

export const EmailRedirectPage = () => {
  return null
}
