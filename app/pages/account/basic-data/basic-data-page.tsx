import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { getUserContext } from "~/business/auth/auth.server"
import { buildBasicDataLayout } from "~/components/forms/custom/basic-data/build-basic-data-layout"
import { buildBasicDataQuestions } from "~/components/forms/custom/basic-data/build-basic-data-questions"
import { toBasicDataAnswers } from "~/components/forms/custom/basic-data/to-basic-data-answers"
import { commitJson } from "~/components/forms/runtime/commit-json"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { gridPresentation } from "~/components/forms/runtime/presentations/grid"
import type { Answers } from "~/components/forms/runtime/question.types"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import { basicDataCopy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import type { Route } from "./+types/basic-data-page"

const {
  dash: {
    DASHBOARD,
    account: { ACCOUNT_READY, BASIC_DATA_COMMIT },
  },
  admin: { ADMIN_DASHBOARD },
} = paths

// Built once: a presentation that changes identity remounts the run, and with
// it everything already typed.
const BasicDataScreen = gridPresentation(buildBasicDataLayout())

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.basicData.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const {
    currentProfile: profile,
    currentUser,
    supabase,
  } = await getUserContext(request, params)

  // Check for orphaned profile with user's email
  let orphanedProfile = null
  if (currentUser?.email) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", currentUser.email)
      .is("user_id", null)
      .single()

    // Only set orphanedProfile if we found one (ignore "no rows" error)
    if (data && !error) {
      orphanedProfile = data
    } else if (error && error.code !== "PGRST116") {
      // Log unexpected errors but don't fail the loader
      console.error("Error checking for orphaned profile:", error)
    }
  }

  return { profile, orphanedProfile }
}

const BasicDataPage = ({ loaderData }: Route.ComponentProps) => {
  const { profile, orphanedProfile } = loaderData || {}
  const navigate = useNavigate()

  // A profile waiting under this e-mail is the person's own history, from
  // before they had an account. It is what the form should open holding.
  const profileData = orphanedProfile || profile

  const questions = useMemo(() => buildBasicDataQuestions(), [])
  const initialAnswers = useMemo(
    () => toBasicDataAnswers(profileData ?? null),
    [profileData],
  )

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> => {
      return commitJson(BASIC_DATA_COMMIT, answers, (pathname) =>
        void navigate(pathname),
      )
    },
    [navigate],
  )

  const flow = useMemo(
    () => buildSingleScreenFlow(questions, commit),
    [questions, commit],
  )

  // Whether this has been done before is read from the row that will be
  // adopted, and before the save: a returning person whose profile was waiting
  // under their e-mail is not filling this in for the first time, and by the
  // time the run is done basic_data_filled is true for everyone.
  //
  // Being an admin is read from the account instead, because roles hang off
  // user_id and a profile left behind has none — an orphan is never an admin.
  const destination = profile?.is_admin
    ? ADMIN_DASHBOARD
    : profileData?.basic_data_filled
      ? DASHBOARD
      : ACCOUNT_READY

  return (
    <>
      <div>
        <h1>{basicDataCopy.title}</h1>
        <p className="text-muted-foreground">
          {orphanedProfile
            ? basicDataCopy.intro.orphan
            : profile?.basic_data_filled
              ? basicDataCopy.intro.update
              : basicDataCopy.intro.initial}
        </p>
      </div>

      <FormRunner
        questions={questions}
        flow={flow}
        presentation={BasicDataScreen}
        initialAnswers={initialAnswers}
        // No persistence, deliberately: the answers include a CPF and an RG,
        // and persistence writes them to sessionStorage.
        onDone={() => {
          toast.success(basicDataCopy.successToast)
          void navigate(destination)
        }}
      />
    </>
  )
}

export default BasicDataPage
