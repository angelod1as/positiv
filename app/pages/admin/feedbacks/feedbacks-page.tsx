import { inputFromForm } from "composable-functions"
import { useLoaderData } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import { updateFeedbackStatusSchema } from "~/business/feedback/feedback-schema"
import {
  getAllFeedbacksWithVerification,
  updateFeedbackStatus,
} from "~/business/feedback/feedback.server"
import { FeedbacksTable } from "~/components/organisms/tables/admin/feedbacks-table"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/feedbacks-page"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Admin - Feedbacks")
}

export async function action({ request }: Route.ActionArgs) {
  const { intent } = await inputFromForm(request)

  if (intent === "update-feedback-status") {
    return await formAction({
      request,
      schema: updateFeedbackStatusSchema,
      mutation: updateFeedbackStatus,
      transformResult: (result) => ({ ...result, intent }),
    })
  }

  return { intent }
}

export async function loader() {
  const result = await getAllFeedbacksWithVerification()
  if (!result.success) {
    return redirectWithError(
      ADMIN_DASHBOARD,
      "Erro ao carregar feedbacks. Tente novamente.",
    )
  }
  return { feedbacks: result.data }
}

const FeedbacksPage = () => {
  const { feedbacks } = useLoaderData<typeof loader>()

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Feedbacks</h1>
      <FeedbacksTable feedbacks={feedbacks} />
    </>
  )
}

export default FeedbacksPage
