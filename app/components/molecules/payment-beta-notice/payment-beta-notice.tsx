import { Copy } from "~/components/atoms/copy/copy"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { paymentsCopy } from "~/copy/payments"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"

const { betaNotice } = paymentsCopy

export const PaymentBetaNotice = ({ eventTitle }: { eventTitle: string }) => {
  const whatsappLink = `https://wa.me/${POSITIV_WHATSAPP}?text=${encodeURIComponent(betaNotice.whatsappMessage(eventTitle))}`

  return (
    <Alert>
      <AlertDescription>
        <Copy>{betaNotice.body(whatsappLink)}</Copy>
      </AlertDescription>
    </Alert>
  )
}
