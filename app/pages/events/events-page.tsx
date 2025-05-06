import { redirect } from "react-router"
import paths from "~/lib/paths"
import type { Route } from "./+types/events-page"

const {
  dash: { DASHBOARD },
} = paths

export async function loader({ request }: Route.LoaderArgs) {
  redirect(DASHBOARD, { headers: request.headers })
}
