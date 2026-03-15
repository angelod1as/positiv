import { useState } from "react"
import { Form, redirect, useActionData, useNavigation } from "react-router"
import { redirectWithError } from "remix-toast"
import { calculatePaymentPrice } from "~/business/payment/calculate-payment-price"
import {
  validatePaymentToken,
  type ValidatePaymentTokenResult,
} from "~/business/payment/validate-payment-token.server"
import {
  createPaymentCharge,
  getOrCreateAsaasCustomer,
} from "~/integrations/asaas/client.server"
import {
  formatCentavos,
  MAX_INSTALLMENTS,
  PAYMENT_LINK_EXPIRY_HOURS,
} from "~/integrations/asaas/constants"
import type { PaymentMethod } from "~/integrations/asaas/types"
import { formatDateISO } from "~/lib/helpers/format-date-time"
import { kyselyDb } from "~/kysely-db"
import { Button } from "~/components/atoms/button/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import paths from "~/lib/paths"
import { addHours } from "date-fns"
import type { Route } from "./+types/payment"

const {
  root: { HOME },
} = paths

export async function loader({ params }: Route.LoaderArgs) {
  const result = await validatePaymentToken(params.token)

  if (result.status === "not_found") {
    throw await redirectWithError(HOME, "Link de pagamento inválido")
  }

  return result
}

export async function action({ request, params }: Route.ActionArgs) {
  const result = await validatePaymentToken(params.token)
  if (result.status !== "ready") {
    return { error: "Link de pagamento inválido ou expirado" }
  }

  const formData = await request.formData()
  const method = formData.get("method") as PaymentMethod | null
  const installments = method === "credit_card"
    ? Number(formData.get("installments") ?? 1)
    : 1

  if (!method || !["pix", "credit_card"].includes(method)) {
    return { error: "Método de pagamento inválido" }
  }

  if (method === "credit_card" && (installments < 1 || installments > MAX_INSTALLMENTS)) {
    return { error: "Número de parcelas inválido" }
  }

  const existingCharge = await kyselyDb
    .selectFrom("payment_transactions")
    .select(["asaas_payment_data"])
    .where("event_participant_id", "=", result.data.participantId)
    .where("status", "=", "pending")
    .executeTakeFirst()

  if (existingCharge?.asaas_payment_data) {
    const data = existingCharge.asaas_payment_data as Record<string, unknown>
    if (typeof data.invoiceUrl === "string") {
      return redirect(data.invoiceUrl)
    }
  }

  const { totalAmount } = calculatePaymentPrice(method, installments)

  if (!result.data.cpf || !result.data.fullName) {
    return { error: "Dados do participante incompletos" }
  }

  const strippedCpf = result.data.cpf.replace(/\D/g, "")
  const displayName = result.data.socialName ?? result.data.fullName

  const customer = await getOrCreateAsaasCustomer({
    name: displayName,
    cpfCnpj: strippedCpf,
    email: result.data.email ?? undefined,
    notificationDisabled: true,
  })

  const now = new Date()
  const expiresAt = addHours(now, PAYMENT_LINK_EXPIRY_HOURS)
  const dueDate = formatDateISO(expiresAt)

  const charge = await createPaymentCharge({
    paymentMethod: method,
    customer: customer.id,
    dueDate,
    amount: totalAmount,
    installments: method === "credit_card" ? installments : undefined,
    description: `Positiv - ${result.data.eventTitle}`,
    externalReference: params.token,
    callback: { successUrl: `${request.url}/success`, autoRedirect: true },
  })

  await kyselyDb
    .insertInto("payment_transactions")
    .values({
      event_participant_id: result.data.participantId,
      profile_id: result.data.profileId,
      event_id: result.data.eventId,
      asaas_payment_id: charge.id,
      asaas_customer_id: customer.id,
      asaas_payment_data: charge as unknown as string,
      payment_method: method,
      amount: totalAmount,
      installments: method === "credit_card" ? installments : null,
      status: "pending",
      created_by: result.data.profileId,
    })
    .execute()

  return redirect(charge.invoiceUrl)
}

type LoaderData = Exclude<ValidatePaymentTokenResult, { status: "not_found" }>

const PaymentPage = ({ loaderData }: { loaderData: LoaderData }) => {
  if (loaderData.status === "expired") {
    return (
      <Card className="my-12 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">
            {loaderData.data.eventEmoji} {loaderData.data.eventTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Este link de pagamento expirou. Entre em contato com a organização para obter um novo link.</p>
        </CardContent>
        <CardFooter>
          <Button to={HOME}>Voltar para a home</Button>
        </CardFooter>
      </Card>
    )
  }

  if (loaderData.status === "already_paid") {
    return (
      <Card className="my-12 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">
            {loaderData.data.eventEmoji} {loaderData.data.eventTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Seu pagamento já foi confirmado! Não é necessário pagar novamente.</p>
        </CardContent>
        <CardFooter>
          <Button to={HOME}>Voltar para a home</Button>
        </CardFooter>
      </Card>
    )
  }

  return <PaymentForm data={loaderData.data} />
}

function PaymentForm({
  data,
}: {
  data: Extract<ValidatePaymentTokenResult, { status: "ready" }>["data"]
}) {
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [installments, setInstallments] = useState(1)
  const actionData = useActionData<{ error?: string }>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  const price = method ? calculatePaymentPrice(method, installments) : null

  return (
    <Card className="my-12 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {data.eventEmoji} {data.eventTitle}
        </CardTitle>
        <CardDescription>
          Olá, {data.participantName}! Escolha a forma de pagamento:
        </CardDescription>
      </CardHeader>
      <Form method="post">
        <CardContent className="flex flex-col gap-6">
          <input type="hidden" name="method" value={method ?? ""} />
          <input type="hidden" name="installments" value={installments} />

          <RadioGroup
            value={method ?? undefined}
            onValueChange={(value) => {
              setMethod(value as PaymentMethod)
              if (value === "pix") {
                setInstallments(1)
              }
            }}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="pix" id="method-pix" />
              <Label htmlFor="method-pix">Pix</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="credit_card" id="method-cc" />
              <Label htmlFor="method-cc">Cartão de crédito</Label>
            </div>
          </RadioGroup>

          {method === "credit_card" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="installments-select">Parcelas</Label>
              <Select
                value={String(installments)}
                onValueChange={(value) => setInstallments(Number(value))}
              >
                <SelectTrigger id="installments-select">
                  <SelectValue placeholder="Selecione as parcelas" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map(
                    (n) => {
                      const { totalAmount, installmentValue } = calculatePaymentPrice("credit_card", n)
                      return (
                        <SelectItem key={n} value={String(n)}>
                          {n}x de R$ {formatCentavos(installmentValue)} (total R$ {formatCentavos(totalAmount)})
                        </SelectItem>
                      )
                    }
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {price && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-lg font-semibold">
                Total: R$ {formatCentavos(price.totalAmount)}
              </p>
              {method === "credit_card" && installments > 1 && (
                <p className="text-sm text-muted-foreground">
                  {installments}x de R$ {formatCentavos(price.installmentValue)}
                </p>
              )}
            </div>
          )}

          {actionData?.error && (
            <p className="text-sm text-destructive">{actionData.error}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!method || isSubmitting}>
            {isSubmitting ? "Processando..." : "Pagar"}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  )
}

export default PaymentPage
