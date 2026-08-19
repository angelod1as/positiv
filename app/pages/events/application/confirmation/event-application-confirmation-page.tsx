import { redirect } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { Button } from "~/components/atoms/button/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import { kyselyDb } from "~/kysely-db"
import type { Route } from "./+types/event-application-confirmation-page"
import { Copy } from "~/components/atoms/copy/copy"
import { applicationConfirmationCopy } from "~/copy/events"
import { metaCopy } from "~/copy/meta"

const {
  dash: { DASHBOARD },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)

  if (!params.id || !currentProfile) return redirect(DASHBOARD)

  const application = await kyselyDb
    .selectFrom("event_participants")
    .select("id")
    .where("event_id", "=", params.id)
    .where("profile_id", "=", currentProfile.id)
    .where("is_user_applied", "=", true)
    .executeTakeFirst()

  if (!application) return redirect(DASHBOARD)

  return null
}

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.applicationConfirmation)
}

const EventApplicationConfirmationPage = ({}: Route.ComponentProps) => {
  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>{applicationConfirmationCopy.title}</h1>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Copy>{applicationConfirmationCopy.received}</Copy>
        <Copy>{applicationConfirmationCopy.warning}</Copy>
        <Copy>{applicationConfirmationCopy.emailOnTheWay}</Copy>
      </CardContent>

      <CardFooter>
        <Button to={DASHBOARD}>{applicationConfirmationCopy.backToDashboard}</Button>
      </CardFooter>
    </Card>
  )
}

export default EventApplicationConfirmationPage
