import { Turnstile } from "@marsidev/react-turnstile"
import { data, useLoaderData } from "react-router"
import { redirectWithSuccess, redirectWithError } from "remix-toast"
import { feedbackFormSchema } from "~/business/feedback/feedback-schema"
import { submitFeedback } from "~/business/feedback/feedback.server"
import { FeedbackRateLimiter } from "~/business/feedback/feedback-rate-limiter"
import { SchemaForm } from "~/components/forms/base/schema-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { getTurnstileConfig } from "~/lib/helpers/get-turnstile-config.server"
import { verifyTurnstileToken } from "~/lib/helpers/verify-turnstile.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/feedback-page"

const rateLimiter = new FeedbackRateLimiter()

export const loader = async () => {
  const { siteKey } = getTurnstileConfig()
  return { turnstileSiteKey: siteKey }
}

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData()
  const formValues = Object.fromEntries(formData)

  const parsed = feedbackFormSchema.safeParse(formValues)
  if (!parsed.success) {
    return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"

  if (rateLimiter.isRateLimited(ip)) {
    return redirectWithError(
      paths.root.FEEDBACK,
      "Você já enviou um feedback recentemente. Por favor, aguarde antes de enviar outro.",
    )
  }

  const turnstileResult = await verifyTurnstileToken(
    parsed.data.captchaToken,
    ip,
    { ip },
  )
  if (!turnstileResult.success) {
    return data(
      { errors: { captchaToken: ["Verificação de segurança falhou"] } },
      { status: 400 },
    )
  }

  const { captchaToken: _, ...feedbackData } = parsed.data
  await submitFeedback(feedbackData, ip)
  rateLimiter.recordRequest(ip)

  return redirectWithSuccess(
    paths.root.HOME,
    "Obrigado pelo seu feedback! Sua opinião é muito importante para nós.",
  )
}

const FeedbackPage = () => {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col gap-6 py-8">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Envie seu Feedback</CardTitle>
          <CardDescription>
            <p>
              Sua opinião é muito importante para nós. Compartilhe suas
              sugestões, críticas ou elogios. Você pode deixar seu contato se
              quiser que respondamos.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaForm
            schema={feedbackFormSchema}
            labels={{
              name: "Nome (opcional)",
              email: "E-mail (opcional)",
              whatsapp: "WhatsApp (opcional)",
              hasParticipated: "Já participou de algum evento?",
              feedbackText: "Seu feedback",
            }}
            placeholders={{
              name: "Seu nome",
              email: "email@exemplo.com",
              whatsapp: "11999999999",
              feedbackText: "Escreva aqui seu feedback, sugestão ou crítica...",
            }}
            inputTypes={{
              email: "email",
              feedbackText: "textarea",
            }}
            options={{
              hasParticipated: [
                { name: "Nunca participei", value: "never" },
                { name: "Participei uma vez", value: "once" },
                { name: "Participei mais de uma vez", value: "more_than_once" },
              ],
            }}
            hiddenFields={["captchaToken"]}
            buttonLabel="Enviar Feedback"
            pendingButtonLabel="Enviando..."
          >
            {({ Field, Button, Errors, setValue }) => (
              <>
                <Field name="name" />
                <Field name="email" />
                <Field name="whatsapp" />
                <Field name="hasParticipated" />
                <Field name="feedbackText" />

                <div className="flex flex-col gap-2">
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    options={{
                      appearance: "always",
                    }}
                    onSuccess={(token) => {
                      setValue("captchaToken", token)
                    }}
                    onExpire={() => setValue("captchaToken", "")}
                    onError={() => setValue("captchaToken", "")}
                  />
                  <Field name="captchaToken" />
                </div>

                <Errors />
                <Button />
              </>
            )}
          </SchemaForm>
        </CardContent>
      </Card>
    </div>
  )
}

export default FeedbackPage
