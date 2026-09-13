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

/**
 * Three answers, not two. A charge cancelled or expired between the Asaas
 * redirect and this page loading is closed, and telling that person a
 * confirmation email is on its way promises something nothing will send.
 *
 * `needs_cpf` is only ever answered for a row that is still open, so the
 * payment really may be in flight and the waiting message is the honest one.
 */
function thanksMessage(data: PaymentPageData) {
  if (data.state === "paid") {
    return { title: page.thanksPaidTitle, body: page.thanksPaidBody }
  }
  if (data.state === "closed") {
    return { title: page.closedTitle, body: page.closedBody }
  }
  return { title: page.thanksTitle, body: page.thanksBody }
}

const PaymentThanksPage = ({ loaderData }: Route.ComponentProps) => {
  const { title, body } = thanksMessage(loaderData as PaymentPageData)

  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>{title}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Copy>{body}</Copy>
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
