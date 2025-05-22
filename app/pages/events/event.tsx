import { redirect } from "react-router"
import paths from "~/lib/paths"
import type { Route } from "./+types/event"

const {
  dash: { DASHBOARD },
} = paths

export async function loader({}: Route.LoaderArgs) {
  redirect(DASHBOARD)
}
