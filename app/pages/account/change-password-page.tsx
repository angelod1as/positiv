import { applySchema } from "composable-functions"
import { formAction } from "remix-forms"
import { SchemaForm } from "~/components/forms/schema-form"
import { zod } from "~/lib/helpers/zod"
import paths from "~/lib/paths"
import { createServerClient } from "~/lib/supabase/server"
import type { Route } from "./+types/change-password-page"

// TODO: Protected routes!

const contextSchema = zod.custom<{ request: Request }>()

const {
  dash: {
    account: { ACCOUNT },
  },
} = paths

const schema = zod
  .object({
    password: zod
      .string()
      .min(6, "A senha precisa ter, no mínimo, 6 caracteres"),
    confirm_password: zod.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "As senhas não combinam",
    path: ["confirm_password"],
  })

const mutation = applySchema(
  schema,
  contextSchema,
)(async (values, context) => {
  const { request } = context
  const { supabase } = createServerClient(request)
  const { error } = await supabase.auth.updateUser({
    password: values.password,
  })

  if (error) {
    if (error.code === "same_password") {
      throw new Error("Será que essa não era a sua senha? Tente outra.")
    }
    console.error(error)
    throw new Error(
      "Não conseguimos resetar sua senha. Entre em contato com o administrador",
    )
  }

  return
})

export const action = async ({ request }: Route.ActionArgs) => {
  return formAction({
    request,
    schema,
    mutation,
    successPath: ACCOUNT,
    context: { request },
  })
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
        schema={schema}
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
