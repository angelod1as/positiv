import type { FC } from "react"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

import { formatDateTime } from "~/lib/helpers/format-date-time"
import { generateGoogleCalendarLink } from "~/lib/helpers/generate-google-calendar-link"
import type { ViewEvent } from "~types/entities.types"
import { EventCardFooter } from "./event-card-footer"

type EventCardProps = { event: ViewEvent; "data-testid": string }
export const EventCard: FC<EventCardProps> = ({
  event,
  "data-testid": dataTestId,
}) => {
  const googleLink = generateGoogleCalendarLink(event)

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
    is_set_reminder,
  } = event

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
        </div>
      </CardContent>
      <CardFooter>
        <EventCardFooter
          eventId={id}
          event_status={event_status}
          googleLink={googleLink}
          is_applied={is_applied}
          is_set_reminder={is_set_reminder}
          dataTestId={dataTestId}
        />
      </CardFooter>
    </Card>
  )
}
