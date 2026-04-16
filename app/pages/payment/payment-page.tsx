import { applySchema } from "composable-functions"
import { redirect, useLoaderData } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import { getContext } from "~/business/auth/auth.server"
import { paymentFormSchema } from "~/business/payment/payment-form-schema"
import { assertPaymentSystemOnline } from "~/business/payment/payment-guard.server"
import {
  confirmPaymentChoice,
  getActivePaymentRequest,
} from "~/business/payment/payment-request.server"
import {
  buildPaymentOptions,
  type PaymentOption,
} from "~/business/payment/payment-pricing.server"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { kyselyDb } from "~/kysely-db"
import paths from "~/lib/paths"
import type { Route } from "./+types/payment-page"

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

async function getEventParticipantWithAuth(request: Request, params: Route.LoaderArgs["params"]) {
  assertPaymentSystemOnline()

  const { currentUser } = await getContext(request, params)
  if (!currentUser) {
    throw await redirectWithError(paths.auth.LOGIN, "Você precisa estar logade para acessar esta página.")
  }

  const eventParticipantId = params.eventParticipantId
  if (!eventParticipantId) {
    throw await redirectWithError(paths.root.HOME, "Link de pagamento inválido.")
  }

  const profile = await kyselyDb
    .selectFrom("profiles")
    .select(["id"])
    .where("user_id", "=", currentUser.id)
    .executeTakeFirst()

  if (!profile) {
    throw await redirectWithError(paths.root.HOME, "Perfil não encontrado.")
  }

  const eventParticipant = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("events", "events.id", "event_participants.event_id")
    .select([
      "event_participants.id",
      "event_participants.profile_id",
      "event_participants.event_id",
      "events.title as event_title",
      "events.ticket_price",
    ])
    .where("event_participants.id", "=", eventParticipantId)
    .executeTakeFirst()

  if (!eventParticipant) {
    throw await redirectWithError(paths.root.HOME, "Inscrição não encontrada.")
  }

  if (eventParticipant.profile_id !== profile.id) {
    throw await redirectWithError(paths.root.HOME, "Você não tem permissão para acessar esta página de pagamento.")
  }

  return { eventParticipant, eventParticipantId }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { eventParticipant } = await getEventParticipantWithAuth(request, params)

  const activeRequest = await getActivePaymentRequest(eventParticipant.id)

  if (activeRequest?.status === "paid") {
    return {
      state: "already_paid" as const,
      eventName: eventParticipant.event_title,
      dropdownOptions: [],
    }
  }

  if (!activeRequest) {
    return {
      state: "no_request" as const,
      eventName: eventParticipant.event_title,
      dropdownOptions: [],
    }
  }

  const amount = Number(activeRequest.amount)
  if (!amount) {
    throw await redirectWithError(paths.root.HOME, "Valor de pagamento inválido.")
  }

  const paymentOptions = buildPaymentOptions(amount)
  const dropdownOptions = paymentOptions.map((o) => ({
    name: formatOptionLabel(o),
    value: o.value,
  }))

  return {
    state: "ready" as const,
    eventName: eventParticipant.event_title,
    dropdownOptions,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { eventParticipant } = await getEventParticipantWithAuth(request, params)

  const mutation = applySchema(paymentFormSchema)(
    async ({ paymentOption: selectedValue }) => {
      const result = await confirmPaymentChoice({
        eventParticipantId: eventParticipant.id,
        paymentOption: selectedValue,
      })
      return { invoiceUrl: result.invoiceUrl }
    },
  )

  return formAction({
    request,
    schema: paymentFormSchema,
    mutation,
    transformResult: (result) => {
      if (result.success) {
        if (!result.data.invoiceUrl) {
          throw redirectWithError(
            paths.payment.PAYMENT(params.eventParticipantId),
            "Não foi possível gerar o link de pagamento. Tente novamente.",
          )
        }
        throw redirect(result.data.invoiceUrl)
      }
      return result
    },
  })
}

export default function PaymentPage() {
  const data = useLoaderData<typeof loader>()

  if (data.state === "already_paid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-6 text-center">
          <h1 className="text-2xl font-bold">Pagamento já realizado</h1>
          <p className="text-muted-foreground">
            O pagamento para o evento <strong>{data.eventName}</strong> já foi confirmado.
          </p>
        </div>
      </div>
    )
  }

  if (data.state === "no_request") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-6 text-center">
          <h1 className="text-2xl font-bold">Link expirado</h1>
          <p className="text-muted-foreground">
            Não há um pagamento pendente para o evento <strong>{data.eventName}</strong>.
            Entre em contato com a organização para solicitar um novo link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Pagamento</h1>
          <p className="text-muted-foreground">
            {data.eventName} — Selecione a forma de pagamento
          </p>
        </div>

        <SchemaForm
          schema={paymentFormSchema}
          labels={{ paymentOption: "Forma de pagamento" }}
          options={{ paymentOption: data.dropdownOptions }}
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
