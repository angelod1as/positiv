import { useCallback, useMemo, useRef, type FC } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { buildEventFlow } from "~/components/forms/custom/event/build-event-flow"
import { buildEventLayout } from "~/components/forms/custom/event/build-event-layout"
import { buildEventQuestions } from "~/components/forms/custom/event/build-event-questions"
import { toEventAnswers } from "~/components/forms/custom/event/to-event-answers"
import { commitJson } from "~/components/forms/runtime/commit-json"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { gridPresentation } from "~/components/forms/runtime/presentations/grid"
import type { Answers } from "~/components/forms/runtime/question.types"
import { adminEventsCopy } from "~/copy/admin/events"
import paths from "~/lib/paths"
import type { Event } from "~types/database/entities.types"
import type { CommitResult } from "~types/forms/commit.types"

const {
  admin: {
    events: { ADMIN_EVENT_COMMIT, ADMIN_VIEW_EVENT },
  },
} = paths

const formCopy = adminEventsCopy.form

// Built once: a presentation that changes identity remounts the run, and with
// it everything already typed.
const EventScreen = gridPresentation(buildEventLayout())

type EventFormProps = {
  event?: Event
}

export const EventForm: FC<EventFormProps> = ({ event }) => {
  const navigate = useNavigate()

  // Where to go once it saves. Editing knows from the start; creating only
  // finds out from the save itself, which answers with the event it wrote.
  const savedId = useRef(event?.id ?? "")

  const questions = useMemo(() => buildEventQuestions(), [])
  const initialAnswers = useMemo(() => toEventAnswers(event), [event])

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> => {
      const result = await commitJson<{ id: string }>(
        ADMIN_EVENT_COMMIT,
        // Which event this is, is not something the form asks about.
        { ...answers, id: event?.id },
        (pathname) => void navigate(pathname),
      )

      if (result.ok && result.id) savedId.current = result.id

      return result
    },
    [event?.id, navigate],
  )

  const flow = useMemo(
    () => buildEventFlow(questions, commit),
    [questions, commit],
  )

  return (
    <FormRunner
      questions={questions}
      flow={flow}
      presentation={EventScreen}
      initialAnswers={initialAnswers}
      continueLabel={formCopy.submit}
      // Only while the event is being invented. An event that already exists is
      // read from the database every time the page opens, and a draft kept in
      // the browser would quietly shadow what anyone else had changed since.
      persistence={
        event ? undefined : { formId: "admin-event", scopeId: "novo" }
      }
      onDone={() => {
        toast.success(adminEventsCopy.createEdit.saved(Boolean(event)))
        void navigate(ADMIN_VIEW_EVENT(savedId.current))
      }}
    />
  )
}
