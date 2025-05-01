import { applySchema } from "composable-functions"
import { formAction } from "remix-forms"
import { z } from "zod"
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
import { createClient } from "~/lib/supabase/server"
import { cn } from "~/lib/utils"

import { SchemaForm } from "~/components/forms/schema-form"
import type { Route } from "./+types/login"

const {
  auth: { FORGOT_PASSWORD, LOGON, LOGIN, LOGON_CALLBACK },
  dash: { DASHBOARD: ROOT },
} = paths

const contextSchema = z.custom<{ request: Request }>()

const schema = z
  .object({
    email: z.string().email("Insira um e-mail válido"),
    password: z.string().min(8, { message: "A senha é muito curta" }),
    confirmPassword: z.string(),
    over18: z.boolean().refine((val) => val, {
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
  const headersToSet = new Headers()

  const { supabase } = createClient(request, headersToSet)

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

export const action = async ({ request }: Route.ActionArgs) => {
  return formAction({
    request,
    schema,
    mutation,
    successPath: ROOT,
    context: { request },
  })
}

const Register = ({}: Route.ComponentProps) => {
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

export default Register
