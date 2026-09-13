import { redirectWithError } from "remix-toast"
import { getUserContext } from "~/business/auth/auth.server"
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { metaCopy } from "~/copy/meta"
import { paymentsCopy } from "~/copy/payments"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/payment-thanks-page"
import { loadPaymentPage, type PaymentPageData } from "./payment-page.server"

const { page } = paymentsCopy

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.paymentThanks.title)
}

/**
 * Where Asaas sends the participant once they are done on its side — which is
 * before the money is confirmed. The page reads the row and writes nothing:
 * only the webhook may mark a payment paid.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)

  if (!currentProfile) {
    throw await redirectWithError(paths.dash.DASHBOARD, page.notYours)
  }

  return loadPaymentPage({
    paymentId: params.paymentId,
    profileId: currentProfile.id,
  })
}

const PaymentThanksPage = ({ loaderData }: Route.ComponentProps) => {
  const data = loaderData as PaymentPageData
  const confirmed = data.state === "paid"

  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>{confirmed ? page.thanksPaidTitle : page.thanksTitle}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Copy>{confirmed ? page.thanksPaidBody : page.thanksBody}</Copy>
      </CardContent>
      <CardFooter>
        <Button to={paths.dash.DASHBOARD} variant="outline">
          {page.backToDashboard}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default PaymentThanksPage
