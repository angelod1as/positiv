import { useLoaderData } from "react-router"
import { redirectWithError } from "remix-toast"
import { getAllFeedbacksWithVerification } from "~/business/feedback/feedback.server"
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
