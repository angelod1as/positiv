import { redirectWithError, redirectWithSuccess } from "remix-toast"
import {
  getSubscriptionStatus,
  unsubscribeProfile,
} from "~/business/newsletter/subscription-helpers.server"
import { unsubscribeCopy } from "~/copy/newsletter"
import { sharedCopy } from "~/copy/shared"
import { db } from "~/lib/supabase/db.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/unsubscribe"
import { Button } from "~/components/atoms/button/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

const {
  root: { HOME },
} = paths

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const profileId = url.searchParams.get("id")

  if (!profileId) {
    throw await redirectWithError(HOME, unsubscribeCopy.invalidLink)
  }

  const result = await getSubscriptionStatus(profileId)

  if (!result.success || !result.data) {
    throw await redirectWithError(HOME, unsubscribeCopy.notFound)
  }

  const subscription = result.data

  const profile = await db
    .selectFrom("profiles")
    .select(["email", "full_name", "social_name"])
    .where("id", "=", profileId)
    .executeTakeFirstOrThrow()

  const isAlreadyUnsubscribed =
    !subscription.consent_given || subscription.sync_status === "unsubscribed"

  const displayName =
    profile.social_name || profile.full_name || profile.email

  return {
    profileId,
    email: profile.email,
    name: displayName,
    isAlreadyUnsubscribed,
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const profileId = formData.get("profileId") as string

  if (!profileId) {
    throw await redirectWithError(HOME, unsubscribeCopy.invalidData)
  }

  const result = await unsubscribeProfile(profileId)

  if (!result.success) {
    throw await redirectWithError(HOME, unsubscribeCopy.failed)
  }

  throw await redirectWithSuccess(HOME, {
    message: unsubscribeCopy.successToast,
    duration: 10_000,
  })
}

const UnsubscribePage = ({ loaderData }: Route.ComponentProps) => {
  const { email, name, isAlreadyUnsubscribed } = loaderData

  if (isAlreadyUnsubscribed) {
    return (
      <Card className="my-12 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">
            {unsubscribeCopy.already.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p>
            <strong>{name}</strong>{" "}
            {unsubscribeCopy.already.body(email)}
          </p>
          <p>{unsubscribeCopy.already.resubscribe}</p>
        </CardContent>
        <CardFooter>
          <Button to={HOME}>{sharedCopy.actions.backHome}</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="my-12 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{unsubscribeCopy.title}</CardTitle>
        <CardDescription>{unsubscribeCopy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p>
          <strong>{name}</strong>
        </p>
        <p className="text-sm text-muted-foreground">{email}</p>
      </CardContent>
      <CardFooter className="flex gap-4">
        <form method="post">
          <input type="hidden" name="profileId" value={loaderData.profileId} />
          <Button type="submit" variant="destructive">
            {unsubscribeCopy.confirm}
          </Button>
        </form>
        <Button to={HOME} variant="outline">
          {sharedCopy.actions.back}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default UnsubscribePage
