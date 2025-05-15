import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import {
  changePassword,
  getContext,
  getUserContext,
} from "~/business/auth/auth.server"
import { changePasswordSchema } from "~/business/common"
import { SchemaForm } from "~/components/forms/schema-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/change-password-page"

const {
  dash: {
    account: { ACCOUNT },
  },
} = paths

export const action = async ({ request, params }: Route.ActionArgs) => {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: changePasswordSchema,
    mutation: changePassword,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(ACCOUNT, {
          message: "Um link chegará em seu e-mail, veja lá!",
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
        <h1>Mudar senha</h1>
        <p className="text-muted-foreground">
          Por favor digite sua nova senha abaixo
        </p>
      </div>

      <SchemaForm
        schema={changePasswordSchema}
        labels={{ password: "Nova senha", confirm_password: "Confirmar senha" }}
        placeholders={{ password: "senha123", confirm_password: "senha123" }}
        inputTypes={{
          password: "password",
          confirm_password: "password",
        }}
        pendingButtonLabel="Mudando..."
        buttonLabel="Mudar senha"
      />
    </div>
  )
}

export default ChangePasswordPage
