import { useEffect } from "react"
import { useFetcher } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import { toast } from "sonner"
import {
  getAdminContext,
  getAdminEventById,
  getAdminReminderCountByEventId,
  sendEventReminders,
  updateEventStatus,
} from "~/business/admin/admin.server"
import {
  sendEventRemindersSchema,
  updateEventStatusSchema,
} from "~/business/admin/common"
import { Button } from "~/components/atoms/button/button"
import { SchemaForm } from "~/components/forms/schema-form"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { checkEventStatus } from "~/lib/helpers/check-event-status"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { eventPropNameMap, eventStatusMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event"

const {
  admin: {
    ADMIN_DASHBOARD,
    events: { ADMIN_EDIT_EVENT, ADMIN_DOWNLOAD_EVENT },
  },
} = paths

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)
  const formData = await request.clone().formData()
  const intent = formData.get("intent")

  if (intent === "send-reminders") {
    return await formAction({
      request,
      mutation: sendEventReminders,
      schema: sendEventRemindersSchema,
      transformResult: (result) => ({ ...result, intent }),
    })
  }

  if (intent === "update-event-status") {
    return await formAction({
      request,
      schema: updateEventStatusSchema,
      mutation: updateEventStatus,
      context: { ...context, eventId: params.id },
      transformResult: (result) => ({ ...result, intent }),
    })
  }
}

export async function loader({ params }: Route.LoaderArgs) {
  const eventId = params.id
  if (!eventId) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }
  const result = await getAdminEventById(eventId)
  if (!result.success) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }

  const event = {
    ...result.data,
    event_status: result.data.event_status,
  }

  const { isOpen, isScheduled } = checkEventStatus(event.event_status)

  const reminderCountResult = await getAdminReminderCountByEventId({
    eventId,
    isScheduled,
    isOpen,
  })

  if (!reminderCountResult?.success) {
    return { event, reminderCount: 0 }
  }

  const reminderCount = reminderCountResult.data

  return { event, reminderCount }
}

type FetcherData =
  | {
      success: boolean
      intent: "send-reminders" | "update-event-status"
      errors?: Record<"_global", string[]>
    }
  | undefined

const sendToast = (fetcherData: FetcherData) => {
  if (!fetcherData) {
    return
  }

  if (!fetcherData.success) {
    return toast.error(
      `Houve um erro: ${fetcherData?.errors?._global?.join("; ")}`,
    )
  }

  if (fetcherData.intent === "send-reminders") {
    return toast.success("E-mails colocados na fila de envio com sucesso")
  }

  if (fetcherData.intent === "update-event-status") {
    return toast.success("E-mails colocados na fila de envio com sucesso")
  }
}

const AdminViewEvent = ({ loaderData }: Route.ComponentProps) => {
  const fetcher = useFetcher<FetcherData>()

  useEffect(() => {
    sendToast(fetcher.data)
  }, [fetcher.data])

  const { event, reminderCount = 0 } = loaderData

  const {
    id,
    title,
    description,
    emoji,
    event_status,
    location,
    ticket_price,
    total_spots,
    time_application_start,
    time_application_end,
    time_event_end,
    time_event_start,
    time_group_end,
    time_group_start,
    time_interviews_end,
    time_interviews_start,
    time_payment_end,
    time_payment_start,
  } = event

  const handleSendReminders = (closeDialog: () => void) => {
    fetcher.submit(
      { intent: "send-reminders", event_status, event_id: id },
      { method: "post" },
    )
    closeDialog()
  }

  const { isOpen } = checkEventStatus(event_status)

  return (
    <>
      <h1>
        {emoji} {title}
      </h1>
      <div className="flex gap-2 mb-4 items-center">
        <Button to={ADMIN_EDIT_EVENT(id)}>Editar</Button>
        <Button to={ADMIN_DOWNLOAD_EVENT(id)}>Baixar dados</Button>

        {reminderCount > 0 ? (
          isOpen ? (
            <fetcher.Form method="post">
              <ConfirmDialog
                title="Enviar emails de lembrete?"
                description={
                  <div>
                    <p>
                      Enviar e-mails para todes que pediram para serem
                      lembrades?
                    </p>
                  </div>
                }
                confirmLabel="📨 Enviar"
                cancelLabel="Cancelar"
                isLoading={fetcher.state !== "idle"}
                onConfirm={handleSendReminders}
              >
                <ConfirmDialog.Trigger variant="outline" className="w-full">
                  Enviar {reminderCount} email{reminderCount !== 1 ? "s" : ""}{" "}
                  de lembrete
                </ConfirmDialog.Trigger>
              </ConfirmDialog>
            </fetcher.Form>
          ) : (
            <p>Lembretes: {reminderCount}</p>
          )
        ) : null}
      </div>

      <p className="font-bold">
        Data: {formatDateTime(time_event_start, "long").full}
      </p>
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
      <div className="flex flex-col gap-2">
        <h2>Dados gerais</h2>
        <p>
          {eventPropNameMap("description")}: {description}
        </p>
        <p>
          {eventPropNameMap("location")}: {location}
        </p>
        <p>
          {eventPropNameMap("ticket_price")}: R$ {ticket_price}
        </p>
        <p>
          {eventPropNameMap("total_spots")}: {total_spots}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h2>Datas e horários</h2>
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr>
              <th />
              <th className="font-bold">Início</th>
              <th className="font-bold">Fim</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">Inscrições</td>
              <td>{formatDateTime(time_application_start).date}</td>
              <td>{formatDateTime(time_application_end).date}</td>
            </tr>
            <tr>
              <td className="font-bold">Entrevistas</td>
              <td>{formatDateTime(time_interviews_start).date}</td>
              <td>{formatDateTime(time_interviews_end).date}</td>
            </tr>
            <tr>
              <td className="font-bold">Pagamento</td>
              <td>{formatDateTime(time_payment_start).date}</td>
              <td>{formatDateTime(time_payment_end).date}</td>
            </tr>
            <tr>
              <td className="font-bold">Grupo</td>
              <td>{formatDateTime(time_group_start).date}</td>
              <td>{formatDateTime(time_group_end).date}</td>
            </tr>
            <tr>
              <td className="font-bold">Evento</td>
              <td>{formatDateTime(time_event_start).date}</td>
              <td>{formatDateTime(time_event_end).date}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

export default AdminViewEvent
