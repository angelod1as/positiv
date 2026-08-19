import { formAction } from "remix-forms"
import { Copy } from "~/components/atoms/copy/copy"
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
import { SchemaForm } from "~/components/forms/base/schema-form"
import { loginCopy } from "~/copy/auth"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/login-page"

const {
  auth: { FORGOT_PASSWORD, LOGON },
  dash: { DASHBOARD },
  admin: { ADMIN_DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.login.title)
}

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { currentUser, currentProfile, supabaseHeaders } = await getContext(
    request,
    params,
  )

  if (currentUser) {
    const targetPath = currentProfile?.is_admin ? ADMIN_DASHBOARD : DASHBOARD
    return redirect(targetPath, {
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
        const { data: profileData } = await context.supabase
          .rpc("get_profile_with_roles", { user_id_input: result.data.user.id })
          .single()
        const targetPath = profileData?.is_admin ? ADMIN_DASHBOARD : DASHBOARD

        throw await redirectWithSuccess(
          targetPath,
          {
            message: loginCopy.welcomeToast.message,
            description: loginCopy.welcomeToast.description,
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
      <Card className="my-12">
        <CardHeader>
          <CardTitle className="text-2xl">{loginCopy.title}</CardTitle>
          <CardDescription>
            <p>{loginCopy.description}</p>
            <p className="text-sm">
              <Copy inline>{loginCopy.signupPrompt(LOGON)}</Copy>
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaForm
            schema={loginSchema}
            labels={loginCopy.labels}
            placeholders={loginCopy.placeholders}
            inputTypes={{
              email: "email",
              password: "password",
            }}
            pendingButtonLabel={loginCopy.pendingButtonLabel}
            buttonLabel={loginCopy.buttonLabel}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            <Link to={FORGOT_PASSWORD}>{loginCopy.forgotPassword}</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default LoginPage
