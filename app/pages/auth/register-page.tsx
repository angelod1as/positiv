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

import { redirectWithSuccess } from "remix-toast"
import { getContext, registerUser } from "~/business/auth/auth.server"
import { registerUserSchema } from "~/business/common"
import { SchemaForm } from "~/components/forms/schema-form"
import type { Route } from "./+types/register-page"

const {
  root: { HOME },
  auth: { LOGIN },
} = paths

export const action = async ({ request, params }: Route.ActionArgs) => {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: registerUserSchema,
    mutation: registerUser,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(HOME, {
          message: "Um link chegará em seu e-mail, veja lá!",
          duration: 10_000,
        })
      }
      return result
    },
    context,
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
            schema={registerUserSchema}
            labels={{
              password: "Senha",
              email: "E-mail",
              confirmPassword: "Confirme a senha",
              over18: "Sou maior de 18 anos",
            }}
            placeholders={{ email: "email@exemplo.com", password: "senha123" }}
            inputTypes={{
              email: "email",
              password: "password",
              confirmPassword: "password",
              over18: "checkbox",
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
