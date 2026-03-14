import { redirectWithError } from "remix-toast"
import {
  validatePaymentToken,
  type ValidatePaymentTokenResult,
  type PaymentOption,
} from "~/business/payment/validate-payment-token.server"
import { formatCentavos } from "~/integrations/asaas/constants"
import { Button } from "~/components/atoms/button/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import paths from "~/lib/paths"
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
}

function PaymentOptionCard({ option }: { option: PaymentOption }) {
  const label = PAYMENT_METHOD_LABELS[option.method] ?? option.method
  const formattedAmount = formatCentavos(option.amount)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{label}</CardTitle>
        <CardDescription>
          R$ {formattedAmount}
          {option.installments ? ` (até ${option.installments}x)` : ""}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button to={option.invoiceUrl} linkProps={{ target: "_blank", rel: "noopener noreferrer" }}>
          Pagar com {label}
        </Button>
      </CardFooter>
    </Card>
  )
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

  if (loaderData.status === "no_valid_charges") {
    return (
      <Card className="my-12 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">
            {loaderData.data.eventEmoji} {loaderData.data.eventTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Não há opções de pagamento disponíveis. Entre em contato com a organização.</p>
        </CardContent>
        <CardFooter>
          <Button to={HOME}>Voltar para a home</Button>
        </CardFooter>
      </Card>
    )
  }

  const { eventTitle, eventEmoji, participantName, paymentOptions } =
    loaderData.data

  return (
    <Card className="my-12 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {eventEmoji} {eventTitle}
        </CardTitle>
        <CardDescription>
          Olá, {participantName}! Escolha a forma de pagamento:
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {paymentOptions.map((option) => (
          <PaymentOptionCard key={option.method} option={option} />
        ))}
      </CardContent>
    </Card>
  )
}

export default PaymentPage
