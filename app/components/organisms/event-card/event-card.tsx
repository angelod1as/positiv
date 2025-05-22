import { DialogClose } from "@radix-ui/react-dialog"
import type { FC } from "react"
import { useFetcher } from "react-router"
import { Button } from "~/components/atoms/button/button"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { generateGoogleCalendarLink } from "~/lib/helpers/generate-google-calendar-link"
import paths from "~/lib/paths"
import type { ViewEvent } from "~types/entities.types"
import { DateStatus } from "./date-status"

const {
  dash: {
    participant: { DOWNLOAD_CALENDAR },
    events: { EVENT_VIEW },
  },
} = paths

type EventCardProps = { event: ViewEvent; "data-testid": string }
export const EventCard: FC<EventCardProps> = ({
  event,
  "data-testid": dataTestId,
}) => {
  const fetcher = useFetcher()

  /* Handle Cancel Application */
  const handleConfirm = async (closeDialog: () => void) => {
    await fetcher.submit(
      { cancel: true, eventId: event.id },
      { method: "POST" },
    )
    closeDialog()
  }

  const {
    time_application_end,
    time_application_start,
    description,
    emoji,
    time_event_end,
    event_status,
    time_group_end,
    time_group_start,
    id,
    time_interviews_end,
    time_interviews_start,
    location,
    time_payment_start,
    time_payment_end,
    time_event_start,
    ticket_price,
    title,
    is_applied,
  } = event

  const isEventOpen = event_status === "Registration Open"
  const googleLink = generateGoogleCalendarLink(event)

  return (
    <Card className="flex flex-col flex-1" data-testid={dataTestId}>
      <CardHeader>
        <CardTitle>
          <div className="flex gap-2">
            <div>
              <div className="text-6xl">{emoji}</div>
            </div>
            <div>
              <p className="font-bold text-muted-foreground">
                {formatDateTime(time_event_start).full}
              </p>
              <h3>{title}</h3>
            </div>
          </div>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grow">
        <div className="flex flex-col gap-4">
          <div>
            {ticket_price && (
              <DataPair pair={["Valor", `R$ ${ticket_price}`]} />
            )}
            {location && <DataPair pair={["Local", location]} />}
          </div>
          <DateStatus
            time_application_end={time_application_end}
            time_application_start={time_application_start}
            time_event_end={time_event_end}
            time_group_end={time_group_end}
            time_group_start={time_group_start}
            time_interviews_end={time_interviews_end}
            time_interviews_start={time_interviews_start}
            time_payment_start={time_payment_start}
            time_payment_end={time_payment_end}
            time_event_start={time_event_start}
          />
        </div>
      </CardContent>
      <CardFooter>
        {is_applied ? (
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
                      to={DOWNLOAD_CALENDAR(event.id)}
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
        ) : (
          <Button
            data-testid={dataTestId}
            to={isEventOpen ? EVENT_VIEW(id) : ""}
            disabled={!isEventOpen}
          >
            {isEventOpen ? "Fazer inscrição" : "Inscreva-se em breve"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
