import { type FC } from "react"
import { type FetcherWithComponents } from "react-router"

import { updateEventStatusSchema } from "~/business/admin/common"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { eventStatusMap } from "~/lib/helpers/propMaps"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { ComposableFetcherData, EventStatus } from "~types/database/entities.types"

type EventStatusFormProps = {
  event_status: EventStatus
  auto_publish?: boolean | null
  time_application_start?: string | null
  fetcher: FetcherWithComponents<ComposableFetcherData>
}
export const EventStatusForm: FC<EventStatusFormProps> = ({
  fetcher,
  event_status,
  auto_publish,
  time_application_start,
}) => {
  const isScheduledForAutoPublish = event_status === "Scheduled" && auto_publish && time_application_start
  const publishTime = time_application_start ? new Date(time_application_start) : null
  const isValidDate = publishTime && !isNaN(publishTime.getTime())
  const isPastPublishTime = isValidDate && publishTime <= new Date()
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
            {isScheduledForAutoPublish && isValidDate && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
                {!isPastPublishTime ? (
                  <>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      📅 Publicação Automática Agendada
                    </p>
                    <p className="text-blue-700 dark:text-blue-200 mt-1">
                      Este evento será publicado automaticamente em{" "}
                      {formatDateTime(time_application_start).full}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-orange-900 dark:text-orange-100">
                      ⏳ Aguardando Publicação Automática
                    </p>
                    <p className="text-orange-700 dark:text-orange-200 mt-1">
                      Este evento está pronto para ser publicado automaticamente (será atualizado em até 5 minutos)
                    </p>
                  </>
                )}
              </div>
            )}
            {event_status === "Scheduled" && !auto_publish && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-md text-sm">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  ✋ Publicação Manual
                </p>
                <p className="text-gray-700 dark:text-gray-200 mt-1">
                  Este evento requer publicação manual. Altere o status para "Inscrições Abertas" quando desejar publicar.
                </p>
              </div>
            )}
          </>
        )
      }}
    </SchemaForm>
  )
}
