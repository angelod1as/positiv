import { useEffect, type FC } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import { Button } from "~/components/atoms/button/button"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"

import { checkEventStatus } from "~/lib/helpers/check-event-status"
import paths from "~/lib/paths"
import type { EventStatus } from "~types/entities.types"

const {
  dash: {
    // participant: { DOWNLOAD_CALENDAR },
    events: { EVENT_VIEW },
  },
} = paths

type EventCardFooterProps = {
  is_applied: boolean | undefined
  is_set_reminder: boolean | undefined
  event_status: EventStatus
  googleLink: string | undefined
  eventId: string
  dataTestId: string | undefined
}
export const EventCardFooter: FC<EventCardFooterProps> = ({
  is_applied,
  event_status,
  // googleLink,
  eventId,
  dataTestId,
  is_set_reminder,
}) => {
  const fetcher = useFetcher()

  useEffect(() => {
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      console.error(fetcher.data.error)
    }
  }, [fetcher.data])

  const handleConfirmCancel = async (closeDialog: () => void) => {
    await fetcher.submit(
      { cancel: true, eventId, fetchId: "handleConfirmCancel" },
      { method: "POST" },
    )
    closeDialog()
  }

  const handleAddReminder = async (closeDialog: () => void) => {
    await fetcher.submit(
      { eventId, fetchId: "handleAddReminder" },
      { method: "POST" },
    )
    closeDialog()
  }

  const handleRemoveReminder = async (closeDialog: () => void) => {
    await fetcher.submit(
      { eventId, fetchId: "handleRemoveReminder" },
      { method: "POST" },
    )
    closeDialog()
  }

  const { isClosed, isOpen, isScheduled } = checkEventStatus(event_status)

  if (isClosed) {
    if (is_set_reminder) {
      return (
        <fetcher.Form method="post">
          <ConfirmDialog
            title="Cancelar lembrete"
            description={
              <div>
                <p>
                  Se você confirmar, vamos cancelar seu e-mail lembrete e você{" "}
                  <b>não</b> será avisade quando esse evento abrir inscrições.
                </p>
              </div>
            }
            confirmLabel="😢 Cancelar"
            cancelLabel="🎉 Voltar"
            isLoading={fetcher.state !== "idle"}
            onConfirm={handleRemoveReminder}
          >
            <ConfirmDialog.Trigger variant="outline" className="w-full">
              Cancelar aviso
            </ConfirmDialog.Trigger>
          </ConfirmDialog>
        </fetcher.Form>
      )
    }

    return (
      <fetcher.Form method="post">
        <ConfirmDialog
          title="Receber um lembrete"
          description={
            <div>
              <p>
                Se você confirmar, te enviaremos um email quando as inscrições
                abrirem. Massa, né?
              </p>
            </div>
          }
          confirmLabel="📅 Lembre-me!"
          cancelLabel="Voltar"
          isLoading={fetcher.state !== "idle"}
          onConfirm={handleAddReminder}
        >
          <ConfirmDialog.Trigger variant="default" className="w-full">
            Me avise quando as inscrições abrirem
          </ConfirmDialog.Trigger>
        </ConfirmDialog>
      </fetcher.Form>
    )
  }

  if (is_applied) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        {/* TODO: Fix dates & times */}
        {/* <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Adicionar ao Calendário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar ao calendário</DialogTitle>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:justify-between">
              {googleLink && (
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    to={googleLink}
                    linkProps={{ target: "_blank" }}
                  >
                    Google Calendar
                  </Button>
                </DialogClose>
              )}
              <DialogClose asChild>
                <Button
                  variant="outline"
                  to={DOWNLOAD_CALENDAR(eventId)}
                  linkProps={{ reloadDocument: true }}
                >
                  Baixar arquivo iCal
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}

        <fetcher.Form method="post">
          <ConfirmDialog
            title="Cancelar inscrição"
            description={
              <div>
                <p>Você tem certeza que deseja cancelar sua inscrição?</p>
              </div>
            }
            confirmLabel="😢 Cancelar"
            cancelLabel="🎉 Voltar"
            isLoading={fetcher.state !== "idle"}
            onConfirm={handleConfirmCancel}
          >
            <ConfirmDialog.Trigger variant="destructive" className="w-full">
              Cancelar inscrição
            </ConfirmDialog.Trigger>
          </ConfirmDialog>
        </fetcher.Form>
      </div>
    )
  }

  if (isOpen) {
    return (
      <Button data-testid={dataTestId} to={EVENT_VIEW(eventId)}>
        Fazer inscrição
      </Button>
    )
  }

  if (isScheduled) {
    return (
      <Button data-testid={dataTestId} disabled={true}>
        Inscrições encerradas
      </Button>
    )
  }

  return (
    <Button data-testid={dataTestId} disabled={true}>
      Inscreva-se em breve
    </Button>
  )
}
