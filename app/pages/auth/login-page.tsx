import { useCallback, useMemo, useRef } from "react"
import { redirect, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { getContext } from "~/business/auth/auth.server"
import type { SignInResult } from "~/business/auth/sign-in.server"
import { Copy } from "~/components/atoms/copy/copy"
import { Link } from "~/components/atoms/link/link"
import { buildLoginQuestions } from "~/components/forms/custom/login/build-login-questions"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import type { Answers } from "~/components/forms/runtime/question.types"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { loginCopy } from "~/copy/auth"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import { safeRedirect } from "~/lib/helpers/safe-redirect"
import paths from "~/lib/paths"
import { cn } from "~/lib/utils"
import type { Route } from "./+types/login-page"

const {
  auth: { FORGOT_PASSWORD, LOGON, LOGIN_COMMIT },
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
    const home = currentProfile?.is_admin ? ADMIN_DASHBOARD : DASHBOARD
    const targetPath = safeRedirect(
      new URL(request.url).searchParams.get("redirect_to"),
      home,
    )
    return redirect(targetPath, {
      headers: supabaseHeaders,
    })
  }

  return null
}

const LoginPage = ({}: Route.ComponentProps) => {
  const navigate = useNavigate()

  const questions = useMemo(() => buildLoginQuestions(), [])

  // Where the sign-in said to go. Held in a ref rather than in state because
  // the run is over by the time it is read, and a render in between would only
  // redraw a form nobody is looking at any more.
  const destination = useRef(DASHBOARD)

  // Where the person was going when the guard turned them away. Carried to the
  // sign-in, which is the one that decides whether it is a place we will send
  // anybody.
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirect_to")

  const commit = useCallback(
    async (answers: Answers): Promise<SignInResult> => {
      const response = await fetch(LOGIN_COMMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(redirectTo ? { ...answers, redirectTo } : answers),
      })

      const result = (await response.json()) as SignInResult
      if (result.ok) destination.current = result.redirectTo

      return result
    },
    [redirectTo],
  )

  const flow = useMemo(
    () => buildSingleScreenFlow(questions, commit),
    [questions, commit],
  )

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
          <FormRunner
            questions={questions}
            flow={flow}
            presentation={AllAtOnce}
            continueLabel={loginCopy.buttonLabel}
            pendingLabel={loginCopy.pendingButtonLabel}
            // No persistence, deliberately: the answers include a password, and
            // persistence writes them to sessionStorage.
            onDone={() => {
              toast.success(loginCopy.welcomeToast.message, {
                description: loginCopy.welcomeToast.description,
                duration: 10_000,
                closeButton: true,
              })
              void navigate(destination.current)
            }}
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
