import type { FC } from "react"
import { Button } from "~/components/atoms/button/button"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { formatDate } from "~/lib/helpers/format-date"
import paths from "~/lib/paths"
import type { ViewEvent } from "~types/entities.types"
import { DateStatus } from "./date-status"

const {
  dash: {
    participant: {
      events: { EVENT_RULES },
    },
  },
} = paths

type EventCardProps = { event: ViewEvent; "data-testid": string }
export const EventCard: FC<EventCardProps> = ({
  event,
  "data-testid": dataTestId,
}) => {
  // const fetcher = useFetcher()
  // const busy = fetcher.state !== "idle"

  const {
    application_close_time,
    application_open_time,
    description,
    emoji,
    ending_time,
    event_status,
    group_close_date,
    group_open_date,
    id,
    interview_process_end,
    interview_process_start,
    location,
    payment_end_date,
    payment_start_date,
    starting_time,
    ticket_price,
    title,
    is_applied,
  } = event

  const isEventOpen = event_status === "Registration Open"

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
                {formatDate({ date: starting_time })}
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
            application_close_time={application_close_time}
            application_open_time={application_open_time}
            ending_time={ending_time}
            group_close_date={group_close_date}
            group_open_date={group_open_date}
            interview_process_end={interview_process_end}
            interview_process_start={interview_process_start}
            payment_end_date={payment_end_date}
            payment_start_date={payment_start_date}
            starting_time={starting_time}
          />
        </div>
      </CardContent>
      <CardFooter>
        {is_applied ? (
          <div className="flex gap-4 w-full justify-between">
            {/* TODO: Calendar add */}
            {/* <Button data-testid={dataTestId} variant="outline">
                Adicionar ao Calendário
              </Button> */}
            {/* TODO: Turn this into a FORM that will trigger an ACTION on the page */}
            {/* <ConfirmDialog
              trigger={{
                label: isCancelPending ? "Cancelando..." : "Cancelar inscrição",
                variant: "destructive",
                disabled: isCancelPending,
              }}
              dialog={{
                title: "Cancelar inscrição",
                description: "Tem certeza?",
              }}
              cancel={{ label: "Voltar", variant: "outline" }}
              confirm={{
                label: "Cancelar",
                variant: "destructive",
                targetFn: handleCancel,
                disabled: isCancelPending,
              }}
            /> */}
          </div>
        ) : (
          <Button
            data-testid={dataTestId}
            to={isEventOpen ? EVENT_RULES(id) : ""}
            disabled={!isEventOpen}
          >
            {isEventOpen ? "Fazer inscrição" : "Inscreva-se em breve"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
