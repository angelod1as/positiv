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
      <span className="text-xs font-bold text-muted-foreground">
        {dualPrice.label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-primary tabular-nums">
          {formatCurrency(pixPrice(base))}
        </span>
        <span className="text-sm text-muted-foreground">{dualPrice.pix}</span>
      </span>
      <span className="text-sm text-muted-foreground">
        <span className="line-through tabular-nums">{formatCurrency(base)}</span>{" "}
        {dualPrice.cardSuffix}
      </span>
    </div>
  )
}
