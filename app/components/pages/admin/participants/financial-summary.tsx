import type { FC } from "react"
import { Card, CardContent } from "~/components/ui/card"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import {
  formatCurrency,
  formatSignedCurrency,
} from "~/lib/helpers/format-currency"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { holdsPayment } from "~/lib/helpers/payment-status"
import type { ParticipantEventHistoryData } from "~types/database/entities.types"

const financialCopy = adminParticipantsCopy.financialSummary

type FinancialSummaryProps = {
  participantHistory: ParticipantEventHistoryData[]
}

export const FinancialSummary: FC<FinancialSummaryProps> = ({
  participantHistory,
}) => {
  // Money Positiv still holds is the question, not the amount: a staff spot
  // owed nothing and still took part, an open charge collected nothing, and a
  // refund gave back what it collected. All three read as zero, so the status
  // is what separates them.
  const paidEvents = participantHistory.filter((item) =>
    holdsPayment(item.payment_status),
  )

  if (paidEvents.length === 0) {
    return null
  }

  // What the participant paid and Positiv still holds, the same arithmetic the
  // grid and the payment modal report: the fees stay in, the refund comes out.
  const heldAmount = (item: ParticipantEventHistoryData) =>
    item.paid_gross - item.refunded

  const totalPaid = paidEvents.reduce((sum, item) => sum + heldAmount(item), 0)
  const totalFees = paidEvents.reduce((sum, item) => sum + item.fee, 0)
  const totalNet = paidEvents.reduce((sum, item) => sum + item.net, 0)

  const paidEventsCount = paidEvents.length

  // What Positiv kept is what an average is worth knowing about; the gross
  // carries whatever Asaas took that month.
  const averagePerEvent = paidEventsCount > 0 ? totalNet / paidEventsCount : 0

  // Only a participation with an amount can be compared to the ticket price. A
  // staff spot and a participation from before anyone wrote the amount down
  // both read as zero, and calling that a difference of minus the ticket price
  // describes someone who underpaid, which is not what either of them did.
  const eventsWithAnAmount = paidEvents.filter((item) => item.paid_gross > 0)

  const totalSurplus = eventsWithAnAmount.reduce(
    (sum, item) => sum + (item.net - Number(item.ticket_price ?? 0)),
    0,
  )

  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold mb-4">{financialCopy.title}</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {financialCopy.totalInvested}
            </p>
            <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {financialCopy.totalFees}
            </p>
            <p className="text-xl font-bold">{formatCurrency(totalFees)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {financialCopy.totalNet}
            </p>
            <p className="text-xl font-bold">{formatCurrency(totalNet)}</p>
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
              const hasAnAmount = item.paid_gross > 0
              const surplus = item.net - Number(item.ticket_price ?? 0)
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
                    {formatCurrency(heldAmount(item))}{" "}
                    {hasAnAmount && (
                      <span
                        className={
                          surplus >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        ({formatSignedCurrency(surplus)})
                      </span>
                    )}
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
