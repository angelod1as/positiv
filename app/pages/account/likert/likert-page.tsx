import { Link, redirect } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { canSeeLikert } from "~/business/profile/likert-answers.server"
import { listLikertSubmissions } from "~/business/profile/likert-submissions.server"
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import { likertPageCopy as copy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/likert-page"

const {
  dash: {
    account: { ACCOUNT, LIKERT_ANSWER, LIKERT_SUBMISSION },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.likert.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)
  if (!currentProfile || !(await canSeeLikert(currentProfile))) {
    return redirect(ACCOUNT)
  }

  const submissions = await listLikertSubmissions(
    currentProfile.id,
    currentProfile,
  )

  return {
    submissions: submissions.map(({ id, submittedAt }) => ({
      id,
      submittedAt: submittedAt.toISOString(),
    })),
  }
}

const LikertPage = ({ loaderData }: Route.ComponentProps) => {
  const { submissions } = loaderData
  const answered = submissions.length > 0

  return (
    <>
      <h1>{copy.title}</h1>

      <div className="flex flex-col gap-8">
        <Copy>{copy.historyIntro}</Copy>

        <Button to={LIKERT_ANSWER}>
          {answered ? copy.answerAgain : copy.answer}
        </Button>

        {answered ? (
          <section className="flex flex-col gap-4">
            <h2>{copy.historyTitle}</h2>
            <ul className="flex flex-col gap-2">
              {submissions.map(({ id, submittedAt }) => (
                <li key={id}>
                  <Link to={LIKERT_SUBMISSION(id)} className="underline">
                    {copy.submittedOn(
                      formatDateTime(submittedAt).full ?? submittedAt,
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p>{copy.empty}</p>
        )}
      </div>
    </>
  )
}

export default LikertPage
