import { Turnstile } from "@marsidev/react-turnstile"
import { data, useLoaderData } from "react-router"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import { ENV } from "varlock/env"
import { feedbackRateLimiter } from "~/business/feedback/feedback-rate-limiter"
import { feedbackFormSchema } from "~/business/feedback/feedback-schema"
import { submitFeedback } from "~/business/feedback/feedback.server"
import { notifyNewFeedback } from "~/business/feedback/notify-new-feedback.server"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { Card, CardContent } from "~/components/ui/card"
import { getTurnstileConfig } from "~/lib/helpers/get-turnstile-config.server"
import { verifyTurnstileToken } from "~/lib/helpers/verify-turnstile.server"
import { createMetaArray } from "~/lib/helpers/meta"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/feedback-page"

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Feedback")
}

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

  const ip = request.headers.get("cf-connecting-ip") || "unknown"

  const isDev = ENV.APP_ENV === "development"
  if (!isDev) {
    if (feedbackRateLimiter.isRateLimited(ip)) {
      return redirectWithError(
        paths.root.FEEDBACK,
        "Você já enviou um feedback recentemente. Por favor, aguarde antes de enviar outro.",
      )
    }
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
  const feedback = await submitFeedback(feedbackData, ip)

  void notifyNewFeedback(feedback).catch((error) =>
    logger.error("Failed to notify a new feedback", { error }),
  )

  if (!isDev) {
    feedbackRateLimiter.recordRequest(ip)
  }

  return redirectWithSuccess(
    paths.root.HOME,
    "Obrigado pelo seu feedback! Sua opinião é muito importante para nós.",
  )
}

const FeedbackPage = () => {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col gap-6 my-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Envie seu Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Compartilhe aqui anonimamente (ou não) sugestões, críticas ou elogios.
        </p>
        <Card className="bg-muted/50 mt-2">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              A Positiv leva em consideração exclusivamente os feedbacks
              relacionados com a nossa organização e nosso evento. Nos
              reservamos a não apurar denúncias de casos ocorridos fora dos
              nossos espaços.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Feedbacks de festas só serão aceitos via o formulário oficial
              enviado no grupo do WhatsApp do evento.
            </p>
          </CardContent>
        </Card>
      </div>
      <SchemaForm
        schema={feedbackFormSchema}
        labels={{
          name: "Nome (opcional)",
          email: "E-mail (opcional)",
          whatsapp: "WhatsApp (opcional)",
          hasParticipated: "Já participou de algum evento?",
          feedbackText: "Seu feedback",
          canContact: "Podemos entrar em contato?",
        }}
        descriptions={{
          canContact:
            "Se for o caso, podemos continuar uma comunicação por WhatsApp ou e-mail.",
        }}
        placeholders={{
          name: "Seu nome",
          email: "email@exemplo.com",
          whatsapp: "11999999999",
          feedbackText: "Escreva aqui seu feedback, sugestão ou crítica...",
        }}
        inputTypes={{
          email: "email",
          canContact: "checkbox",
        }}
        multiline={["feedbackText"]}
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
          <div className="flex flex-col gap-4">
            <Field name="name" />
            <Field name="email" />
            <Field name="whatsapp" />
            <Field name="hasParticipated" />
            <Field name="feedbackText" />
            <Field name="canContact" />

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
          </div>
        )}
      </SchemaForm>
    </div>
  )
}

export default FeedbackPage
