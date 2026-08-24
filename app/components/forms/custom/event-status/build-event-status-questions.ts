import { updateEventStatusSchema } from "~/business/admin/common"
import type { Question } from "~/components/forms/runtime/question.types"
import { adminEventsCopy } from "~/copy/admin/events"
import { ALL_EVENT_STATUS_OPTIONS, eventStatusMap } from "~/lib/helpers/propMaps"

/**
 * One question. The alternatives come from the list every admin screen reads,
 * rather than a second one written out here that a new status could be added
 * to the database without ever reaching.
 */
export function buildEventStatusQuestions(): Question[] {
  return [
    {
      id: "event_status",
      prompt: adminEventsCopy.statusForm.label,
      input: {
        kind: "select",
        options: ALL_EVENT_STATUS_OPTIONS.map((status) => ({
          value: status,
          label: eventStatusMap(status),
        })),
      },
      schema: updateEventStatusSchema.shape.event_status,
    },
  ]
}
