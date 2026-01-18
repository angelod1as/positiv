import { EyeIcon } from "lucide-react"
import { useEffect, type FC } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import { Button } from "~/components/atoms/button/button"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"

import { checkEventStatus } from "~/lib/helpers/check-event-status"
import { useAnalytics } from "~/lib/hooks/use-analytics"
import { useSmartPrefetch } from "~/lib/hooks/use-smart-prefetch"
import paths from "~/lib/paths"
import type { EventStatus } from "~types/database/entities.types"

const {
  dash: {
    // participant: { DOWNLOAD_CALENDAR },
    events: { EVENT_VIEW },
  },
  admin: {
    events: { ADMIN_VIEW_EVENT },
  },
} = paths

type EventCardFooterProps = {
  is_applied: boolean | undefined
  event_status: EventStatus
  googleLink: string | undefined
  eventId: string
  dataTestId: string | undefined
  isAdmin?: boolean
}
export const EventCardFooter: FC<EventCardFooterProps> = ({
  is_applied,
  event_status,
  // googleLink,
  eventId,
  dataTestId,
  isAdmin,
}) => {
  const fetcher = useFetcher()
  const prefetchStrategy = useSmartPrefetch()
  const { track } = useAnalytics()

  useEffect(() => {
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      console.error(fetcher.data.error)
    }
  }, [fetcher.data])

  if (isAdmin) {
    return (
      <div className="flex flex-row gap-4 w-full">
        <Button to={ADMIN_VIEW_EVENT(eventId)}>
          <EyeIcon className="h-4 w-4 mr-2" />
          Ver evento
        </Button>
      </div>
    )
  }

  const handleConfirmCancel = async (closeDialog: () => void) => {
    await fetcher.submit(
      { cancel: true, eventId, fetchId: "handleConfirmCancel" },
      { method: "POST" },
    )
    closeDialog()
  }

  const handleCancelButtonClick = () => {
    track("event_cancel_clicked", { eventId })
  }

  const { isClosed, isOpen, isScheduled } = checkEventStatus(event_status)

  if (isScheduled) {
    return (
      <Button data-testid={dataTestId} disabled={true}>
        Inscrições em breve
      </Button>
    )
  }

  if (isClosed) {
    return (
      <Button data-testid={dataTestId} disabled={true}>
        Inscrições encerradas
      </Button>
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
            <ConfirmDialog.Trigger
              variant="destructive"
              className="w-full"
              onClick={handleCancelButtonClick}
            >
              Cancelar inscrição
            </ConfirmDialog.Trigger>
          </ConfirmDialog>
        </fetcher.Form>
      </div>
    )
  }

  if (isOpen) {
    return (
      <Button
        data-testid={dataTestId}
        to={EVENT_VIEW(eventId)}
        linkProps={{ prefetch: prefetchStrategy }}
      >
        Fazer inscrição
      </Button>
    )
  }

  return (
    <Button data-testid={dataTestId} disabled={true}>
      Inscreva-se em breve
    </Button>
  )
}
