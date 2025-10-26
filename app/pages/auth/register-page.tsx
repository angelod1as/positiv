import { Turnstile } from "@marsidev/react-turnstile"
import { useLoaderData } from "react-router"
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

import { getContext, registerUser } from "~/business/auth/auth.server"
import { registerUserSchema } from "~/business/common"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { getTurnstileConfig } from "~/lib/helpers/get-turnstile-config.server"
import type { Route } from "./+types/register-page"

const {
  auth: { LOGIN, LOGON_EMAIL_MESSAGE },
} = paths

export const loader = async () => {
  const { siteKey } = getTurnstileConfig()
  return { turnstileSiteKey: siteKey }
}

export const action = async ({ request, params }: Route.ActionArgs) => {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: registerUserSchema,
    mutation: registerUser,
    successPath: LOGON_EMAIL_MESSAGE,
    context,
  })
}

const RegisterPage = ({}: Route.ComponentProps) => {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()

  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card className="my-12">
        <CardHeader>
          <CardTitle className="text-2xl">Inscreva-se</CardTitle>
          <CardDescription>
            <p>
              Depois de se cadastrar, uma mensagem de confirmação vai chegar em
              seu email.
            </p>
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
            hiddenFields={["captchaToken"]}
            pendingButtonLabel="Entrando..."
          >
            {({ Field, Button, Errors, setValue }) => (
              <>
                <Field name="email" />
                <Field name="password" />
                <Field name="confirmPassword" />
                <Field name="over18" />

                <div className="flex flex-col gap-2">
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => {
                      setValue("captchaToken", token)
                    }}
                    onExpire={() => setValue("captchaToken", "")}
                    onError={() => setValue("captchaToken", "")}
                  />
                  <Field name="captchaToken" />
                </div>

                <Errors />
                <Button />
              </>
            )}
          </SchemaForm>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Já tem uma conta? <Link to={LOGIN}>Entre aqui</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default RegisterPage
