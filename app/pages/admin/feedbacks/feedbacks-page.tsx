import { inputFromForm } from "composable-functions"
import { useLoaderData } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import { getAdminContext } from "~/business/admin/admin.server"
import { updateFeedbackStatusSchema } from "~/business/feedback/feedback-schema"
import {
  getAllFeedbacksWithVerification,
  updateFeedbackStatus,
} from "~/business/feedback/feedback.server"
import { FeedbacksTable } from "~/components/organisms/tables/admin/feedbacks-table"
import { adminFeedbacksCopy } from "~/copy/admin"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/feedbacks-page"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.adminFeedbacks.title)
}

export async function action({ request, params }: Route.ActionArgs) {
  // The admin guard is a layout loader, and loaders do not run before a child
  // action, so the action has to check the context itself
  await getAdminContext(request, params)

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
    return redirectWithError(ADMIN_DASHBOARD, adminFeedbacksCopy.loadFailed)
  }
  return { feedbacks: result.data }
}

const FeedbacksPage = () => {
  const { feedbacks } = useLoaderData<typeof loader>()

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{adminFeedbacksCopy.title}</h1>
      <FeedbacksTable feedbacks={feedbacks} />
    </>
  )
}

export default FeedbacksPage
