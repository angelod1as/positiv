import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { forgotPassword, getContext } from "~/business/auth/auth.server"
import { forgotPasswordSchema } from "~/business/common"
import { Copy } from "~/components/atoms/copy/copy"
import { SchemaForm } from "~/components/forms/base/schema-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { forgotPasswordCopy } from "~/copy/auth"
import { metaCopy } from "~/copy/meta"
import paths from "~/lib/paths"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/forgot-password-page"

const {
  auth: { LOGIN },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.forgotPassword.title)
}

export const action = async ({ request, params }: Route.ActionArgs) => {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: forgotPasswordSchema,
    mutation: forgotPassword,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(LOGIN, {
          message: forgotPasswordCopy.successToast,
          duration: 10_000,
        })
      }
      return result
    },
    context,
  })
}

const ForgotPasswordPage = ({}: Route.ComponentProps) => {
  return (
    <>
      <Card className="my-12">
        <CardHeader>
          <CardTitle className="text-2xl">{forgotPasswordCopy.title}</CardTitle>{" "}
          <CardDescription>
            <p>{forgotPasswordCopy.description}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaForm
            schema={forgotPasswordSchema}
            labels={forgotPasswordCopy.labels}
            placeholders={forgotPasswordCopy.placeholders}
            inputTypes={{
              email: "email",
            }}
            pendingButtonLabel={forgotPasswordCopy.pendingButtonLabel}
            buttonLabel={forgotPasswordCopy.buttonLabel}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            <Copy inline>{forgotPasswordCopy.loginPrompt(LOGIN)}</Copy>
          </p>
        </CardFooter>
      </Card>
    </>
  )
}

export default ForgotPasswordPage
