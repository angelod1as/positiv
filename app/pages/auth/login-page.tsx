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
import { cn } from "~/lib/utils"

import { redirect } from "react-router"
import { redirectWithSuccess } from "remix-toast"
import { getContext, loginUser } from "~/business/auth/auth.server"
import { loginSchema } from "~/business/common"
import { SchemaForm } from "~/components/forms/schema-form"
import type { Route } from "./+types/login-page"

const {
  auth: { FORGOT_PASSWORD, LOGON, LOGIN },
  dash: { DASHBOARD },
} = paths

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { currentUser, supabaseHeaders } = await getContext(request, params)

  if (currentUser) {
    return redirect(DASHBOARD, {
      headers: supabaseHeaders,
    })
  }

  return null
}

export const action = async ({ request, params }: Route.ActionArgs) => {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: loginSchema,
    mutation: loginUser,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          LOGIN,
          {
            message: "Bem vinde!",
            description:
              "Nosso sistema ainda está em desenvolvimento. Nos ajude reportando bugs! Link no pé da página",
            duration: 10_000,
            closeButton: true,
          },
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

const LoginPage = ({}: Route.ComponentProps) => {
  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>
            <p>Entre na sua conta com seu e-mail</p>
            <p className="text-sm">
              <b>
                Não tem uma conta? <Link to={LOGON}>Inscreva-se</Link>
              </b>
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaForm
            schema={loginSchema}
            labels={{ password: "Senha", email: "E-mail" }}
            placeholders={{ email: "email@exemplo.com", password: "senha123" }}
            inputTypes={{
              email: "email",
              password: "password",
            }}
            pendingButtonLabel="Entrando..."
            buttonLabel="Entrar"
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
