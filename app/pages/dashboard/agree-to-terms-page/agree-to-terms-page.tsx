import { SirenIcon } from "lucide-react"
import { Fragment } from "react"
import { formAction } from "remix-forms"
import { redirectWithSuccess, redirectWithWarning } from "remix-toast"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { agreeToTermsSchema } from "~/business/common"
import { getSubscriptionStatus } from "~/business/newsletter/subscription-helpers.server"
import { agreeToTerms } from "~/business/participant/agree-to-terms.server"
import { Copy } from "~/components/atoms/copy/copy"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { agreeToTermsCopy } from "~/copy/dashboard"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/agree-to-terms-page"

const {
  dash: {
    account: { BASIC_DATA },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.agreeToTerms.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)

  // Get newsletter subscription status from the new table
  let mktEmails: boolean | undefined = undefined
  if (currentProfile) {
    const result = await getSubscriptionStatus(currentProfile.id)
    if (result.success && result.data) {
      mktEmails = result.data.consent_given
    }
  }

  return { mktEmails }
}

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: agreeToTermsSchema,
    mutation: agreeToTerms,
    transformResult: async (result) => {
      if (result.success) {
        const data = result.data as typeof context & {
          newsletterSubscriptionError?: string
        }

        if (data.newsletterSubscriptionError) {
          throw await redirectWithWarning(
            BASIC_DATA,
            {
              message: agreeToTermsCopy.newsletterWarning,
              duration: Infinity,
              closeButton: true,
            },
            {
              headers: context.supabaseHeaders,
            },
          )
        }

        throw await redirectWithSuccess(
          BASIC_DATA,
          agreeToTermsCopy.successToast,
          {
            headers: context.supabaseHeaders,
          },
        )
      }
      return result
    },
    context,
  })
}

const AgreeToTermsPage = ({ loaderData }: Route.ComponentProps) => {
  const { mktEmails } = loaderData
  return (
    <>
      <h1>{agreeToTermsCopy.title}</h1>
      <Alert variant="destructive">
        <SirenIcon className="h-4 w-4" />
        <AlertTitle>{agreeToTermsCopy.alert.title}</AlertTitle>
        <AlertDescription>{agreeToTermsCopy.alert.body}</AlertDescription>
      </Alert>
      {agreeToTermsCopy.sections.map((section) => (
        <Fragment key={section.heading}>
          <h2>{section.heading}</h2>
          <Copy>{section.body}</Copy>
        </Fragment>
      ))}

      <SchemaForm
        schema={agreeToTermsSchema}
        values={{
          agree: false,
          commonEmails: true,
          mktEmails: mktEmails === undefined ? true : mktEmails,
        }}
        inputTypes={{
          agree: "checkbox",
          commonEmails: "checkbox",
          mktEmails: "checkbox",
        }}
        labels={agreeToTermsCopy.labels}
        descriptions={agreeToTermsCopy.descriptions}
        buttonLabel={agreeToTermsCopy.buttonLabel}
      >
        {({ Field, Errors, Button }) => (
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <Field name="agree" />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 my-4">
              <div className="flex-1">
                <Field name="commonEmails" />
              </div>
              <div className="flex-1">
                <Field name="mktEmails" />
              </div>
            </div>

            <Errors />

            <Button alignment="center" />
          </div>
        )}
      </SchemaForm>
    </>
  )
}

export default AgreeToTermsPage
