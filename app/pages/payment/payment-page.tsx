import { applySchema } from "composable-functions"
import { redirect } from "react-router"
import { formAction } from "remix-forms"
import { assertPaymentSystemOnline } from "~/business/payment/payment-guard.server"
import {
  createAsaasCustomer,
  createAsaasPayment,
} from "~/business/payment/asaas-client.server"
import { paymentFormSchema } from "~/business/payment/payment-form-schema"
import { SchemaForm } from "~/components/forms/base/schema-form"
import type { Route } from "./+types/payment-page"

const PIX_PRICE = 220_00
const CREDIT_CARD_PRICE = 230_00

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100)
}

function buildInstallmentOptions() {
  return Array.from({ length: 3 }, (_, i) => i + 1).map((n) => ({
    name: `${n}x de ${formatCurrency(CREDIT_CARD_PRICE / n)}`,
    value: String(n),
  }))
}

const mutation = applySchema(paymentFormSchema)(async ({
  billingType,
  installmentCount,
}) => {
  const value = billingType === "PIX" ? PIX_PRICE : CREDIT_CARD_PRICE

  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]

  const customer = await createAsaasCustomer({
    name: "Teste PoC",
    cpfCnpj: "24971563792",
  })

  const payment = await createAsaasPayment({
    customerId: customer.id,
    billingType,
    value: value / 100,
    dueDate,
    description: "Positiv — Ingresso",
    installmentCount:
      billingType === "CREDIT_CARD" ? installmentCount : undefined,
  })

  return { invoiceUrl: payment.invoiceUrl }
})

export function loader() {
  assertPaymentSystemOnline()
}

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
          labels={{
            billingType: "Forma de pagamento",
            installmentCount: "Parcelas",
          }}
          options={{
            billingType: [
              {
                name: `Pix — ${formatCurrency(PIX_PRICE)} (à vista)`,
                value: "PIX",
              },
              {
                name: `Cartão de Crédito — ${formatCurrency(CREDIT_CARD_PRICE)}`,
                value: "CREDIT_CARD",
              },
            ],
            installmentCount: buildInstallmentOptions(),
          }}
          values={{ billingType: "PIX" as const, installmentCount: 1 }}
          buttonLabel="Pagar"
          pendingButtonLabel="Processando..."
        >
          {({ Field, Button, Errors, watch }) => {
            const billingType = watch("billingType")

            return (
              <div className="flex flex-col gap-6">
                <Field name="billingType" />
                {billingType === "CREDIT_CARD" && (
                  <Field name="installmentCount" />
                )}
                <Errors />
                <Button />
              </div>
            )
          }}
        </SchemaForm>
      </div>
    </div>
  )
}
