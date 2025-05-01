import { applySchema } from "composable-functions"
import { formAction } from "remix-forms"
import { z } from "zod"
import { Link } from "~/components/atoms/link/link"
import { SchemaForm } from "~/components/forms/schema-form"
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
import type { Route } from "./+types/login"

const {
  auth: { FORGOT_PASSWORD, LOGON },
  dash: { ROOT },
} = paths

const schema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(1),
})

const contextSchema = z.custom<{ request: Request }>()

const mutation = applySchema(
  schema,
  contextSchema,
)(async (values, context) => {
  const { request } = context
  const { supabase } = createClient(request)
  const { error } = await supabase.auth.signInWithPassword(values)

  if (error) {
    if (error.code === "invalid_credentials") {
      throw new Error("Credenciais inválidas")
    }
    throw new Error(
      `Erro de autenticação\nCódigo: ${error.code}\nMensagem:${error.message}`,
    )
  }
})

export const action = async ({ request }: Route.ActionArgs) => {
  formAction({
    request,
    schema,
    mutation,
    context: { request },
    successPath: ROOT,
  })
}

/* REMIX this */
const Login = ({}: Route.ComponentProps) => {
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

export default Login
