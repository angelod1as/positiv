import { redirect } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithWarning } from "remix-toast"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import { getUserContext } from "~/business/auth/auth.server"
import { applyToEventSchema } from "~/business/common"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { rulesSessionStorage } from "~/business/session.server"
import { Copy } from "~/components/atoms/copy/copy"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { eventApplicationCopy } from "~/copy/events"
import { useAnalytics } from "~/lib/hooks/use-analytics"
import paths from "~/lib/paths"
import type { Route } from "./+types/event-user-data"

const {
  dash: {
    events: { EVENT_APPLICATION_SENT, EVENT_RULES },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { getSession } = rulesSessionStorage
  const session = await getSession(request.headers.get("Cookie"))
  const isRulesCorrect = session.get("rulesCorrect")
  if (!isRulesCorrect) return redirect(EVENT_RULES(params.id))
}

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getUserContext(request, params)

  return formAction({
    request,
    schema: applyToEventSchema,
    mutation: applyToEvent,
    transformResult: async (result) => {
      if (result.success) {
        trackServerEvent(
          "event_application_completed",
          { eventId: params.id },
          `/events/${params.id}/apply`
        )

        const emailSent = result.data?.emailSent ?? false

        if (emailSent) {
          throw redirect(EVENT_APPLICATION_SENT(params.id), {
            headers: context.supabaseHeaders,
          })
        } else {
          throw await redirectWithWarning(
            EVENT_APPLICATION_SENT(params.id),
            {
              message: eventApplicationCopy.toasts.emailFailed.message,
              description: eventApplicationCopy.toasts.emailFailed.description,
              duration: 6000,
            },
            {
              headers: context.supabaseHeaders,
            },
          )
        }
      }
      return result
    },
    context,
  })
}

const EventUserInfo = ({ params }: Route.ComponentProps) => {
  const { track } = useAnalytics()

  const handleFormSubmit = () => {
    track("event_application_clicked", { eventId: params.id })
  }

  return (
    <>
      <h1>{eventApplicationCopy.title}</h1>
      <Copy>{eventApplicationCopy.intro}</Copy>

      <div onSubmitCapture={handleFormSubmit}>
        <SchemaForm
          schema={applyToEventSchema}
          hiddenFields={["applicationDate", "eventId"]}
          radio={["bond"]}
          values={{
            applicationDate: new Date(),
            eventId: params.id,
          }}
          multiline={["notes", "companions", "referrals", "referred"]}
          labels={eventApplicationCopy.labels}
          descriptions={eventApplicationCopy.descriptions}
          buttonLabel={eventApplicationCopy.submitLabel}
        />
      </div>
    </>
  )
}

export default EventUserInfo
