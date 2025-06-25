import { type FC } from "react"
import type { FetcherWithComponents } from "react-router"

import { Button } from "~/components/atoms/button/button"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { checkEventStatus } from "~/lib/helpers/check-event-status"
import paths from "~/lib/paths"
import type { Event } from "~types/entities.types"
import type { FetcherData } from "./view-event-page"

const {
  admin: {
    events: { ADMIN_EDIT_EVENT, ADMIN_DOWNLOAD_EVENT },
  },
} = paths

type ButtonProps = {
  event: Event
  fetcher: FetcherWithComponents<FetcherData>
  reminderCount: number
}
export const Buttons: FC<ButtonProps> = ({ event, fetcher, reminderCount }) => {
  const { id, event_status } = event

  const handleSendReminders = (closeDialog: () => void) => {
    fetcher.submit(
      { intent: "send-reminders", event_status, event_id: id },
      { method: "post" },
    )
    closeDialog()
  }

  const { isOpen } = checkEventStatus(event_status)

  return (
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
                    Enviar e-mails para todes que pediram para serem lembrades?
                  </p>
                </div>
              }
              confirmLabel="📨 Enviar"
              cancelLabel="Cancelar"
              isLoading={fetcher.state !== "idle"}
              onConfirm={handleSendReminders}
            >
              <ConfirmDialog.Trigger variant="outline" className="w-full">
                Enviar {reminderCount} email{reminderCount !== 1 ? "s" : ""} de
                lembrete
              </ConfirmDialog.Trigger>
            </ConfirmDialog>
          </fetcher.Form>
        ) : (
          <p>Lembretes: {reminderCount}</p>
        )
      ) : null}
    </div>
  )
}
