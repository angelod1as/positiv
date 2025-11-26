import type { LoaderFunctionArgs } from "react-router"
import { getContext } from "~/business/auth/auth.server"
import { getNextEvents } from "~/pages/homepage/fetch/get-next-events"
import { splitEvents } from "~/pages/dashboard/utils/split-events"

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { currentProfile } = await getContext(request, params)

  if (!currentProfile) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await getNextEvents(currentProfile.id, 12)

  if (!result.success) {
    return Response.json(
      {
        error: result.errors.map((e) => e.message).join(", ") || "Failed to load events",
      },
      { status: 500 },
    )
  }

  const events = splitEvents(result.data)

  return Response.json({ events })
}
