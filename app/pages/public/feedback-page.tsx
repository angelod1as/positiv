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
import { metaCopy } from "~/copy/meta"
import { publicCopy } from "~/copy/public"
import { getTurnstileConfig } from "~/lib/helpers/get-turnstile-config.server"
import { verifyTurnstileToken } from "~/lib/helpers/verify-turnstile.server"
import { createMetaArray } from "~/lib/helpers/meta"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/feedback-page"

const feedbackCopy = publicCopy.feedback

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.feedback.title)
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
      return redirectWithError(paths.root.FEEDBACK, feedbackCopy.rateLimited)
    }
  }

  const turnstileResult = await verifyTurnstileToken(
    parsed.data.captchaToken,
    ip,
    { ip },
  )
  if (!turnstileResult.success) {
    return data(
      { errors: { captchaToken: [feedbackCopy.captchaFailed] } },
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

  return redirectWithSuccess(paths.root.HOME, feedbackCopy.success)
}

const FeedbackPage = () => {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col gap-6 my-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{feedbackCopy.title}</h1>
        <p className="text-sm text-muted-foreground">{feedbackCopy.subtitle}</p>
        <Card className="bg-muted/50 mt-2">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{feedbackCopy.scope}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {feedbackCopy.parties}
            </p>
          </CardContent>
        </Card>
      </div>
      <SchemaForm
        schema={feedbackFormSchema}
        labels={feedbackCopy.labels}
        descriptions={feedbackCopy.descriptions}
        placeholders={feedbackCopy.placeholders}
        inputTypes={{
          email: "email",
          canContact: "checkbox",
        }}
        multiline={["feedbackText"]}
        options={{
          hasParticipated: [
            { name: feedbackCopy.participation.never, value: "never" },
            { name: feedbackCopy.participation.once, value: "once" },
            {
              name: feedbackCopy.participation.moreThanOnce,
              value: "more_than_once",
            },
          ],
        }}
        hiddenFields={["captchaToken"]}
        buttonLabel={feedbackCopy.submit}
        pendingButtonLabel={feedbackCopy.submitting}
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
