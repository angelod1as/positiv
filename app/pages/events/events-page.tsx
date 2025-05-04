import { redirect } from "react-router"
import paths from "~/lib/paths"

const {
  dash: { DASHBOARD },
} = paths

export async function loader() {
  redirect(DASHBOARD)
}
