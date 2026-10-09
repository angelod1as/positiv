import type { FC } from "react"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { pixPrice } from "~/business/payment/pricing"
import { paymentsCopy } from "~/copy/payments"
import { formatCurrency } from "~/lib/helpers/format-currency"

const { dualPrice } = paymentsCopy

type EventPriceProps = {
  base: number
  cardPaymentsEnabled?: boolean
}

export const EventPrice: FC<EventPriceProps> = ({
  base,
  cardPaymentsEnabled = false,
}) => {
  if (!cardPaymentsEnabled) {
    return <DataPair pair={[dualPrice.label, formatCurrency(base)]} />
  }

  return (
    <div className="flex flex-col">
      <span className="flex flex-wrap items-baseline gap-1.5">
        <span className="font-bold tabular-nums">
          {formatCurrency(pixPrice(base))}
        </span>
        <span className="text-sm text-muted-foreground">{dualPrice.pix}</span>
      </span>
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatCurrency(base)} {dualPrice.cardSuffix}
      </span>
    </div>
  )
}
