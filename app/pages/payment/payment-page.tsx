import { applySchema } from "composable-functions"
import { redirect, useLoaderData } from "react-router"
import { formAction } from "remix-forms"
import {
  createAsaasCustomer,
  createAsaasPayment,
} from "~/business/payment/asaas-client.server"
import { paymentFormSchema } from "~/business/payment/payment-form-schema"
import { assertPaymentSystemOnline } from "~/business/payment/payment-guard.server"
import {
  buildPaymentOptions,
  type PaymentOption,
} from "~/business/payment/payment-pricing.server"
import { SchemaForm } from "~/components/forms/base/schema-form"
import type { Route } from "./+types/payment-page"

const TICKET_PRICE = 220

function formatCurrency(reais: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(reais)
}

function formatOptionLabel(o: PaymentOption) {
  if (o.billingType === "PIX") {
    return `Pix — ${formatCurrency(o.totalReais)}`
  }
  if (o.installments === 1) {
    return `Cartão 1x — ${formatCurrency(o.totalReais)}`
  }
  return `Cartão ${o.installments}x de ${formatCurrency(o.perInstallmentReais)} (total ${formatCurrency(o.totalReais)})`
}

export function loader() {
  assertPaymentSystemOnline()

  const paymentOptions = buildPaymentOptions(TICKET_PRICE)
  const dropdownOptions = paymentOptions.map((o) => ({
    name: formatOptionLabel(o),
    value: o.value,
  }))

  return { dropdownOptions, paymentOptions }
}

const mutation = applySchema(paymentFormSchema)(
  async ({ paymentOption: selectedValue }) => {
    const paymentOptions = buildPaymentOptions(TICKET_PRICE)
    const option = paymentOptions.find((o) => o.value === selectedValue)
    if (!option) throw new Error("Opção de pagamento inválida")

    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]

    const customer = await createAsaasCustomer({
      name: "Teste PoC",
      cpfCnpj: "24971563792",
    })

    const payment = await createAsaasPayment({
      customerId: customer.id,
      billingType: option.billingType,
      value: option.totalReais,
      dueDate,
      description: "Positiv — Ingresso",
      installmentCount:
        option.billingType === "CREDIT_CARD" && option.installments > 1
          ? option.installments
          : undefined,
    })

    return { invoiceUrl: payment.invoiceUrl }
  },
)

export async function action({ request }: Route.ActionArgs) {
  assertPaymentSystemOnline()
  return formAction({
    request,
    schema: paymentFormSchema,
    mutation,
    transformResult: (result) => {
      if (result.success) {
        throw redirect(result.data.invoiceUrl)
      }
      return result
    },
  })
}

export default function PaymentPage() {
  const { dropdownOptions } = useLoaderData<typeof loader>()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Pagamento</h1>
          <p className="text-muted-foreground">
            Selecione a forma de pagamento
          </p>
        </div>

        <SchemaForm
          schema={paymentFormSchema}
          labels={{ paymentOption: "Forma de pagamento" }}
          options={{ paymentOption: dropdownOptions }}
          values={{ paymentOption: "PIX" }}
          buttonLabel="Pagar"
          pendingButtonLabel="Processando..."
        >
          {({ Field, Button, Errors }) => (
            <div className="flex flex-col gap-6">
              <Field name="paymentOption" />
              <Errors />
              <Button />
            </div>
          )}
        </SchemaForm>
      </div>
    </div>
  )
}
