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
import { cn } from "~/lib/utils"
import type { Route } from "./+types/login"

const {
  auth: { FORGOT_PASSWORD, LOGON },
  dash: { ROOT },
} = paths

// export const action = async ({ request }: Route.ActionArgs) => {
//   const {
//     errors,
//     data,
//     receivedValues: defaultValues,
//   } = await getValidatedFormData<FormData>(request, resolver)
//   if (errors) {
//     // The keys "errors" and "defaultValues" are picked up automatically by useRemixForm
//     return { errors, defaultValues }
//   }

//   const { supabase } = createClient(request)
//   const { error } = await supabase.auth.signInWithPassword(data)

//   if (error) {
//     if (error.code === "invalid_credentials") {
//       return {
//         authError: "Credenciais inválidas",
//       }
//     }
//     return {
//       authError: error.message,
//     }
//   }

//   return redirect(ROOT)
// }

const schema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(1),
})

const mutation = applySchema(schema)(async (values) => {
  console.log(values)
})

export const action = async ({ request }: Route.ActionArgs) => {
  formAction({
    request,
    schema,
    mutation,
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
          <CardDescription>Entre na sua conta com seu e-mail</CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaForm schema={schema} />
          {/* <Form onSubmit={handleSubmit} method="POST">
            <div className="flex flex-col gap-6">
              <FormInput<FormData>
                id="email"
                label="E-mail"
                placeholder="email@exemplo.com"
                type="email"
                errors={errors.email}
                required
                {...register("email")}
              />
              <FormInput<FormData>
                id="password"
                label="Senha"
                placeholder="senha123"
                type="password"
                errors={errors.password}
                companion={
                  <Link to={FORGOT_PASSWORD}>Esqueci minha senha</Link>
                }
                required
                {...register("password")}
              />
              {authError && <FormError>{authError}</FormError>}
              <Button type="submit">Entrar</Button>
            </div>
          </Form> */}
        </CardContent>
        <CardFooter>
          <p>
            Não tem uma conta? <Link to={LOGON}>Inscreva-se</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default Login
