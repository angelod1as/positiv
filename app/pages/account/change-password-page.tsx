import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import {
  changePassword,
  getContext,
  getUserContext,
} from "~/business/auth/auth.server"
import { changePasswordSchema } from "~/business/common"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { changePasswordCopy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import paths from "~/lib/paths"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/change-password-page"

const {
  dash: {
    account: { ACCOUNT },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.changePassword.title)
}

export const action = async ({ request, params }: Route.ActionArgs) => {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: changePasswordSchema,
    mutation: changePassword,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(ACCOUNT, {
          message: changePasswordCopy.successToast,
          duration: 10_000,
        })
      }
      return result
    },
    context,
  })
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await getUserContext(request, params)
  return {}
}

const ChangePasswordPage = ({}: Route.ComponentProps) => {
  return (
    <div className="flex flex-col w-full max-w-md gap-8">
      <div>
        <h1>{changePasswordCopy.title}</h1>
        <p className="text-muted-foreground">
          {changePasswordCopy.description}
        </p>
      </div>

      <SchemaForm
        schema={changePasswordSchema}
        labels={changePasswordCopy.labels}
        placeholders={changePasswordCopy.placeholders}
        inputTypes={{
          password: "password",
          confirm_password: "password",
        }}
        pendingButtonLabel={changePasswordCopy.pendingButtonLabel}
        buttonLabel={changePasswordCopy.buttonLabel}
      />
    </div>
  )
}

export default ChangePasswordPage
