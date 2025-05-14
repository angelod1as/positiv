import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { forgotPassword, getContext } from "~/business/auth/auth.server"
import { forgotPasswordSchema } from "~/business/common"
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
import type { Route } from "./+types/forgot-password-page"

const {
  auth: { LOGIN },
} = paths

export const action = async ({ request, params }: Route.ActionArgs) => {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: forgotPasswordSchema,
    mutation: forgotPassword,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(LOGIN, {
          message: "Um link chegará em seu e-mail, veja lá!",
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
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Resetar senha</CardTitle>{" "}
          <CardDescription>
            <p>Nada melhor que uma senha nova, certo?</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaForm
            schema={forgotPasswordSchema}
            labels={{ email: "E-mail" }}
            placeholders={{ email: "email@exemplo.com" }}
            inputTypes={{
              email: "email",
            }}
            pendingButtonLabel="Entrando..."
            buttonLabel="Entrar"
          />
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-sm">
            Já tem uma conta? <Link to={LOGIN}>Entre aqui</Link>
          </p>
        </CardFooter>
      </Card>
    </>
  )
}

export default ForgotPasswordPage
