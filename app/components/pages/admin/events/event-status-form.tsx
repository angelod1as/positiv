import { useCallback, useMemo, useState, type FC } from "react"
import { useNavigate, useRevalidator } from "react-router"
import { toast } from "sonner"
import { buildEventStatusFlow } from "~/components/forms/custom/event-status/build-event-status-flow"
import { buildEventStatusQuestions } from "~/components/forms/custom/event-status/build-event-status-questions"
import { EventStatusScreen } from "~/components/forms/custom/event-status/event-status-presentation"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import type { Answers } from "~/components/forms/runtime/question.types"
import { adminEventsCopy } from "~/copy/admin/events"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { EventStatus } from "~types/database/entities.types"
import type { CommitResult } from "~types/forms/commit.types"

const {
  admin: {
    events: { ADMIN_EVENT_STATUS_COMMIT },
  },
} = paths

const statusCopy = adminEventsCopy.statusForm

type EventStatusFormProps = {
  id: string
  event_status: EventStatus
  auto_publish?: boolean | null
  time_application_start?: string | null
}

export const EventStatusForm: FC<EventStatusFormProps> = ({
  id,
  event_status,
  auto_publish,
  time_application_start,
}) => {
  const navigate = useNavigate()
  const revalidator = useRevalidator()

  // Counted so that a refused save starts the run again, seeded from the
  // loader: the select would otherwise be left showing the status the database
  // had just turned down.
  //
  // Only a refused one. Starting again after a save that worked showed the
  // status the admin had just moved away from, for as long as the loader took
  // to come back with the new one — a flicker through the old answer on every
  // single change.
  const [refusals, setRefusals] = useState(0)

  const isScheduledForAutoPublish =
    event_status === "Scheduled" && auto_publish && time_application_start
  const publishTime = time_application_start
    ? new Date(time_application_start)
    : null
  const isValidDate = publishTime && !isNaN(publishTime.getTime())
  const isPastPublishTime = isValidDate && publishTime <= new Date()

  const questions = useMemo(() => buildEventStatusQuestions(), [])
  const initialAnswers = useMemo(() => ({ event_status }), [event_status])

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> => {
      const response = await fetch(ADMIN_EVENT_STATUS_COMMIT(id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      })

      // An admin whose session expired is answered with a redirect, which fetch
      // follows to a page of HTML. Reading that as JSON would only say the save
      // failed, when what they need is to sign in again.
      if (response.redirected) {
        void navigate(new URL(response.url).pathname)
        return { ok: false, errors: [] }
      }

      const result = (await response.json()) as CommitResult

      if (result.ok) {
        toast.success(adminEventsCopy.toasts.statusUpdated)
      } else {
        toast.error(result.message ?? adminEventsCopy.toasts.statusUpdateFailed)
        setRefusals((current) => current + 1)
      }

      void revalidator.revalidate()

      return result
    },
    [id, navigate, revalidator],
  )

  const flow = useMemo(
    () => buildEventStatusFlow(questions, commit),
    [questions, commit],
  )

  return (
    <>
      <FormRunner
        // What the event is, as the database last answered, plus how many saves
        // it has turned down: either changing means the control is showing
        // something the database does not agree with.
        key={`${event_status}:${refusals}`}
        questions={questions}
        flow={flow}
        presentation={EventStatusScreen}
        initialAnswers={initialAnswers}
      />

      {isScheduledForAutoPublish && isValidDate && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
          {!isPastPublishTime ? (
            <>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {statusCopy.scheduledTitle}
              </p>
              <p className="text-blue-700 dark:text-blue-200 mt-1">
                {statusCopy.scheduledFor(
                  formatDateTime(time_application_start).full,
                )}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-orange-900 dark:text-orange-100">
                {statusCopy.awaitingTitle}
              </p>
              <p className="text-orange-700 dark:text-orange-200 mt-1">
                {statusCopy.awaiting}
              </p>
            </>
          )}
        </div>
      )}
      {event_status === "Scheduled" && !auto_publish && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-md text-sm">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {statusCopy.manualTitle}
          </p>
          <p className="text-gray-700 dark:text-gray-200 mt-1">
            {statusCopy.manual}
          </p>
        </div>
      )}
    </>
  )
}
