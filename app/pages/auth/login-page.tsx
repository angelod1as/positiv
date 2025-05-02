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

import { redirect } from "react-router"
import { SchemaForm } from "~/components/forms/schema-form"
import type { Route } from "./+types/login-page"

const {
  auth: { FORGOT_PASSWORD, LOGON },
  dash: { DASHBOARD },
} = paths

const contextSchema = z.custom<{ request: Request }>()

const schema = z.object({
  email: z
    .string()
    .min(1, "Insira pelo menos um caracter")
    .email("E-mail inválido"),
  password: z.string().min(1, "Insira pelo menos um caracter"),
})

const mutation = applySchema(
  schema,
  contextSchema,
)(async (values, context) => {
  const { request } = context
  const { supabase } = createClient(request)
  const { error, data } = await supabase.auth.signInWithPassword(values)

  if (error) {
    if (error.code === "invalid_credentials") {
      console.error("Credenciais inválidas")
      throw new Error("Credenciais inválidas")
    }
    console.error("Credenciais inválidas")
    throw new Error(
      `Erro de autenticação — Código: "${error.code}" — Mensagem: "${error.message}"`,
    )
  }

  return data.user
})

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { supabase } = createClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (data.user) {
    redirect(DASHBOARD)
  }
  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error(`Erro de autenticação, contate o administrador: ${error}`)
  }
  return {}
}

export const action = async ({ request }: Route.ActionArgs) => {
  return formAction({
    request,
    schema,
    mutation,
    successPath: DASHBOARD,
    context: { request },
  })
}

const LoginPage = ({}: Route.ComponentProps) => {
  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>
            <p>Entre na sua conta com seu e-mail</p>
            <p className="text-sm">
              Não tem uma conta? <Link to={LOGON}>Inscreva-se</Link>
            </p>
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
            <Link to={FORGOT_PASSWORD}>Esqueci minha senha</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default LoginPage
