import { applySchema } from "composable-functions"
import { formAction } from "remix-forms"
import { Link } from "~/components/atoms/link/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import paths from "~/lib/paths"
import { createServerClient } from "~/lib/supabase/server"
import { cn } from "~/lib/utils"

import { redirectWithSuccess } from "remix-toast"
import { SchemaForm } from "~/components/forms/schema-form"
import { zod } from "~/lib/helpers/zod"
import type { Route } from "./+types/register-page"

const {
  auth: { LOGIN },
  dash: { DASHBOARD: ROOT },
} = paths

const contextSchema = zod.custom<{ request: Request }>()

const schema = zod
  .object({
    email: zod.string().email("Insira um e-mail válido"),
    password: zod.string().min(8, { message: "A senha é muito curta" }),
    confirmPassword: zod.string(),
    over18: zod.boolean().refine((val) => val, {
      message: "Você só pode se inscrever se for maior de 18 anos",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não são iguais",
    path: ["confirmPassword"],
  })

const mutation = applySchema(
  schema,
  contextSchema,
)(async (values, context) => {
  const { request } = context
  const { supabase } = createServerClient(request)

  const { over18, confirmPassword, ...data } = values

  const { error } = await supabase.auth.signUp({
    ...data,
    // TODO: Is this doable?
    // options: {
    //   emailRedirectTo: `${request.headers.get("origin")}${LOGON_CALLBACK}`,
    // },
  })

  if (error) {
    throw new Error(`Ops, ocorreu um erro. Erro: ${error}`)
  }

  return values
})

// TODO: Move to server file
export const action = async ({ request }: Route.ActionArgs) => {
  return formAction({
    request,
    schema,
    mutation,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(ROOT, {
          message: "Um link chegará em seu e-mail, veja lá!",
          duration: 10_000,
        })
      }
      return result
    },
    context: { request },
  })
}

const RegisterPage = ({}: Route.ComponentProps) => {
  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Inscreva-se</CardTitle>
          <CardDescription>
            <p>Você está quase lá!</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaForm
            schema={schema}
            labels={{ password: "Senha", email: "E-mail" }}
            placeholders={{ email: "email@exemplo.com", password: "senha123" }}
            inputTypes={{
              email: "email",
              password: "password",
            }}
            pendingButtonLabel="Entrando..."
          />
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-sm">
            Já tem uma conta? <Link to={LOGIN}>Entre aqui</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default RegisterPage
