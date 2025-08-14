import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { useLoaderData, useActionData, Form } from "react-router"
import { validateUnsubscribeToken } from "~/business/admin/newsletter/unsubscribe-tokens.server"
import { processUnsubscribe } from "~/business/admin/newsletter/unsubscribe.server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { CheckCircle2, XCircle, AlertCircle, Mail } from "lucide-react"
import { RateLimiter } from "~/lib/rate-limiter"

// Rate limiter: 5 attempts per IP per hour
const rateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
})

export async function loader({ params }: LoaderFunctionArgs) {
  const token = params.token as string
  const validation = validateUnsubscribeToken(token)
  
  return {
    tokenValid: validation.valid,
    profileId: validation.profileId || null,
    error: validation.error || null,
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const profileId = formData.get("profileId") as string
  
  const headers = request.headers
  const ipAddress = headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown"
  const userAgent = headers.get("user-agent") || undefined
  
  // Check rate limit
  if (!rateLimiter.checkLimit(ipAddress)) {
    return {
      success: false,
      rateLimited: true,
      alreadyUnsubscribed: false,
    }
  }
  
  const result = await processUnsubscribe(
    profileId,
    "email_link",
    ipAddress || undefined,
    userAgent || undefined
  )
  
  return {
    success: result.success,
    alreadyUnsubscribed: result.alreadyUnsubscribed || false,
    rateLimited: false,
  }
}

export default function UnsubscribePage() {
  const { tokenValid, profileId, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  
  if (error === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <CardTitle>Link Expirado</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Este link de cancelamento expirou. Por favor, solicite um novo link através do próximo email de newsletter que você receber.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error === "invalid" || !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <CardTitle>Link Inválido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Este link de cancelamento é inválido. Por favor, use o link fornecido no email de newsletter.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (actionData?.rateLimited) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <CardTitle>Muitas tentativas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Você excedeu o número máximo de tentativas de cancelamento. Por favor, aguarde uma hora antes de tentar novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (actionData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <CardTitle>Cancelamento Confirmado</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {actionData.alreadyUnsubscribed
                ? "Você já estava cancelado da nossa lista de emails de marketing."
                : "Sua inscrição foi cancelada com sucesso. Você não receberá mais emails de marketing do Positiv."}
            </p>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Importante</AlertTitle>
              <AlertDescription>
                Você continuará recebendo emails importantes sobre eventos aos quais está inscrito, como confirmações e lembretes.
              </AlertDescription>
            </Alert>
            <div className="pt-4">
              <a href="/" className="text-blue-600 hover:text-blue-800 underline">
                Voltar para a página inicial
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Confirmar Cancelamento</CardTitle>
          <CardDescription>
            Você está prestes a cancelar sua inscrição na lista de emails de marketing do Positiv.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-gray-600">
              Ao cancelar sua inscrição, você não receberá mais:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Novidades sobre próximos eventos</li>
              <li>Atualizações da comunidade</li>
              <li>Ofertas especiais e promoções</li>
            </ul>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Nota</AlertTitle>
              <AlertDescription>
                Você continuará recebendo emails transacionais importantes, como confirmações de inscrição em eventos.
              </AlertDescription>
            </Alert>
          </div>
          
          <Form method="post" className="space-y-4">
            <input type="hidden" name="profileId" value={profileId || ""} />
            <div className="flex gap-3">
              <Button type="submit" variant="destructive" className="flex-1">
                Sim, cancelar inscrição
              </Button>
              <a href="/" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Manter inscrição
                </Button>
              </a>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}