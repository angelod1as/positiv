import { type FC } from "react"
import { type FetcherWithComponents } from "react-router"

import { updateEventStatusSchema } from "~/business/admin/common"
import { SchemaForm } from "~/components/forms/schema-form"
import { eventStatusMap } from "~/lib/helpers/propMaps"
import type { ComposableFetcherData, EventStatus } from "~types/entities.types"

type EventStatusFormProps = {
  event_status: EventStatus
  fetcher: FetcherWithComponents<ComposableFetcherData>
}
export const EventStatusForm: FC<EventStatusFormProps> = ({
  fetcher,
  event_status,
}) => {
  return (
    <SchemaForm
      schema={updateEventStatusSchema}
      fetcher={fetcher}
      labels={{ event_status: "Status do evento" }}
      hiddenFields={["intent"]}
      values={{
        intent: "update-event-status",
        event_status,
      }}
      mode="onChange"
      options={{
        event_status: [
          { value: "Draft", name: eventStatusMap("Draft") },
          { value: "Completed", name: eventStatusMap("Completed") },
          { value: "Cancelled", name: eventStatusMap("Cancelled") },
          { value: "Scheduled", name: eventStatusMap("Scheduled") },
          {
            value: "Registration Closed",
            name: eventStatusMap("Registration Closed"),
          },
          {
            value: "Registration Open",
            name: eventStatusMap("Registration Open"),
          },
        ],
      }}
    >
      {({ Field, submit }) => {
        return (
          <>
            <Field name="intent" hidden />
            <Field name="event_status" onChange={submit} />
          </>
        )
      }}
    </SchemaForm>
  )
}
