import { DialogClose } from "@radix-ui/react-dialog"
import type { FC } from "react"
import { useFetcher } from "react-router"
import { Button } from "~/components/atoms/button/button"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import paths from "~/lib/paths"
import type { EventStatus } from "~types/entities.types"

const {
  dash: {
    participant: { DOWNLOAD_CALENDAR },
    events: { EVENT_VIEW },
  },
} = paths

type EventCardFooterProps = {
  is_applied: boolean | undefined
  event_status: EventStatus
  googleLink: string | undefined
  eventId: string
  dataTestId: string | undefined
}
export const EventCardFooter: FC<EventCardFooterProps> = ({
  is_applied,
  event_status,
  googleLink,
  eventId,
  dataTestId,
}) => {
  const fetcher = useFetcher()

  /* Handle Cancel Application */
  const handleConfirm = async (closeDialog: () => void) => {
    await fetcher.submit({ cancel: true, eventId }, { method: "POST" })
    closeDialog()
  }

  if (is_applied) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <Dialog>
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
        </Dialog>

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
            onConfirm={handleConfirm}
          >
            <ConfirmDialog.Trigger variant="destructive" className="w-full">
              Cancelar inscrição
            </ConfirmDialog.Trigger>
          </ConfirmDialog>
        </fetcher.Form>
      </div>
    )
  }

  if (event_status === "Registration Open") {
    return (
      <Button data-testid={dataTestId} to={EVENT_VIEW(eventId)}>
        Fazer inscrição
      </Button>
    )
  }
  if (event_status === "Registration Closed") {
    return (
      <Button data-testid={dataTestId} disabled={true}>
        Inscrições encerradas
      </Button>
    )
  }

  return (
    <Button data-testid={dataTestId} disabled={true}>
      Inscrições em breve
    </Button>
  )
}
