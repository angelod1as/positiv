import { useState } from "react"
import { Form, redirect, useFetcher } from "react-router"
import { redirectWithError } from "remix-toast"
import { getUserContext } from "~/business/auth/auth.server"
import { pickOption } from "~/business/payment/payment-checkout.server"
import { isValidCpf, normalizeCpf } from "~/business/payment/cpf"
import type { PaymentOption } from "~/business/payment/pricing"
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { metaCopy } from "~/copy/meta"
import { paymentsCopy } from "~/copy/payments"
import { formatCurrency } from "~/lib/helpers/format-currency"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/payment-page"
import { loadPaymentPage, type PaymentPageData } from "./payment-page.server"

const { page, errors } = paymentsCopy

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.payment.title)
}

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

export async function action({ params, request }: Route.ActionArgs) {
  const { currentProfile } = await getUserContext(request, params)

  if (!currentProfile) {
    throw await redirectWithError(paths.dash.DASHBOARD, page.notYours)
  }

  const formData = await request.formData()
  const result = await pickOption({
    paymentId: params.paymentId,
    profileId: currentProfile.id,
    optionId: String(formData.get("optionId") ?? ""),
  })

  if (!result.success) {
    return redirectWithError(
      paths.payment.PAYMENT(params.paymentId),
      result.errors[0]?.message ?? errors.generic,
    )
  }

  // Asaas hosts the checkout, so this leaves the app on purpose.
  throw redirect(result.data.invoiceUrl)
}

const PaymentPage = ({ loaderData }: Route.ComponentProps) => {
  const data = loaderData as PaymentPageData

  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>{page.heading(data.eventTitle)}</h1>
        </CardTitle>
      </CardHeader>
      {renderState(data)}
    </Card>
  )
}

function renderState(data: PaymentPageData) {
  switch (data.state) {
    case "paid":
      return <Receipt amount={data.amount} paidAt={data.paidAt} />
    case "closed":
      return <Closed />
    case "needs_cpf":
      return <CpfGate />
    case "ready":
      return <Options data={data} />
  }
}

const Receipt = ({ amount, paidAt }: { amount: number; paidAt: string }) => (
  <>
    <CardContent className="flex flex-col gap-4">
      <h2 className="font-bold">{page.paidTitle}</h2>
      <Copy>
        {page.paidBody(
          formatCurrency(amount),
          formatDateTime(paidAt).full ?? "",
        )}
      </Copy>
    </CardContent>
    <CardFooter>
      <Button to={paths.dash.DASHBOARD} variant="outline">
        {page.backToDashboard}
      </Button>
    </CardFooter>
  </>
)

const Closed = () => (
  <>
    <CardContent className="flex flex-col gap-4">
      <h2 className="font-bold">{page.closedTitle}</h2>
      <Copy>{page.closedBody}</Copy>
    </CardContent>
    <CardFooter>
      <Button to={paths.dash.DASHBOARD} variant="outline">
        {page.backToDashboard}
      </Button>
    </CardFooter>
  </>
)

/**
 * No charge can be created without a CPF Asaas accepts, so the options are not
 * even offered until the profile carries one. Validated here as well as on the
 * server, so a typo is answered without a round trip.
 */
const CpfGate = () => {
  const fetcher = useFetcher()
  const [cpf, setCpf] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidCpf(cpf)) {
      setError(errors.invalidCpf)
      return
    }
    setError(null)
    fetcher.submit(
      { cpf: normalizeCpf(cpf) },
      { method: "post", action: paths.payment.PAYMENT_CPF_COMMIT },
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="flex flex-col gap-4">
        <h2 className="font-bold">{page.cpfTitle}</h2>
        <Copy>{page.cpfBody}</Copy>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cpf">{page.cpfLabel}</Label>
          <Input
            id="cpf"
            name="cpf"
            inputMode="numeric"
            value={cpf}
            onChange={(event) => setCpf(event.target.value)}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
      </CardContent>
      <CardFooter>
        <Button type="submit" disabled={fetcher.state !== "idle"}>
          {page.cpfSubmit}
        </Button>
      </CardFooter>
    </form>
  )
}

const Options = ({
  data,
}: {
  data: Extract<PaymentPageData, { state: "ready" }>
}) => (
  <Form method="post">
    <CardContent className="flex flex-col gap-4">
      <h2 className="font-bold">{page.chooseOption}</h2>
      <RadioGroup
        name="optionId"
        defaultValue={data.chosen?.id ?? "pix"}
        className="gap-3"
      >
        {data.options.map((option: PaymentOption) => (
          <div key={option.id} className="flex items-center gap-3">
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id}>
              {paymentsCopy.options.label(option)}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <Copy>{page.dueAt(formatDateTime(data.dueAt).full ?? "")}</Copy>
    </CardContent>
    <CardFooter>
      <Button type="submit">{page.pay}</Button>
    </CardFooter>
  </Form>
)

export default PaymentPage
