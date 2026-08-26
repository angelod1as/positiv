import type { FC } from "react"
import { Card, CardContent } from "~/components/ui/card"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import {
  formatCurrency,
  formatSignedCurrency,
} from "~/lib/helpers/format-currency"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { ParticipantEventHistoryData } from "~types/database/entities.types"

const financialCopy = adminParticipantsCopy.financialSummary

type FinancialSummaryProps = {
  participantHistory: ParticipantEventHistoryData[]
}

export const FinancialSummary: FC<FinancialSummaryProps> = ({
  participantHistory,
}) => {
  const paidEvents = participantHistory.filter(
    (item) => Number(item.payment) > 0,
  )

  if (paidEvents.length === 0) {
    return null
  }

  const totalInvested = paidEvents.reduce(
    (sum, item) => sum + Number(item.payment ?? 0),
    0,
  )

  const paidEventsCount = paidEvents.length

  const averagePerEvent =
    paidEventsCount > 0 ? totalInvested / paidEventsCount : 0

  const totalSurplus = paidEvents.reduce((sum, item) => {
    const payment = Number(item.payment)
    const ticketPrice = Number(item.ticket_price ?? 0)
    return sum + (payment - ticketPrice)
  }, 0)

  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold mb-4">{financialCopy.title}</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {financialCopy.totalInvested}
            </p>
            <p className="text-xl font-bold">{formatCurrency(totalInvested)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {financialCopy.paidEvents}
            </p>
            <p className="text-xl font-bold">{paidEventsCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {financialCopy.averagePerEvent}
            </p>
            <p className="text-xl font-bold">
              {formatCurrency(averagePerEvent)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {financialCopy.totalSurplus}
            </p>
            <p className="text-xl font-bold">{formatSignedCurrency(totalSurplus)}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">{financialCopy.payments}</h4>
          <ul className="space-y-2">
            {paidEvents.map((item) => {
              const surplus =
                Number(item.payment ?? 0) - Number(item.ticket_price ?? 0)
              const formattedDate = item.time_event_start
                ? formatDateTime(item.time_event_start).date
                : null

              return (
                <li
                  key={item.id}
                  className="flex justify-between items-center text-sm border-b pb-2"
                >
                  <span>
                    {item.event_emoji} {item.event_title}
                    {formattedDate && (
                      <span className="text-muted-foreground ml-1">
                        ({formattedDate})
                      </span>
                    )}
                    {item.ticket_price != null && (
                      <span className="text-muted-foreground ml-1">
                        ({formatCurrency(Number(item.ticket_price))})
                      </span>
                    )}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(Number(item.payment ?? 0))}{" "}
                    <span
                      className={
                        surplus >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      ({formatSignedCurrency(surplus)})
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
