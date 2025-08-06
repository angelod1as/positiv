import { formAction } from "remix-forms"
import { redirectWithSuccess, redirectWithToast } from "remix-toast"
import { getAdminContext } from "~/business/admin/admin.server"
import { getNewsletterById, updateNewsletter } from "~/business/admin/newsletter/newsletter.server"
import { newsletterFormSchema } from "~/business/admin/newsletter/newsletter-schema"
import { NewsletterForm } from "~/components/forms/admin/newsletter-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/edit"

const {
  admin: {
    newsletters: { ADMIN_NEWSLETTERS, ADMIN_VIEW_NEWSLETTER },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
  
  const newsletterId = params.id
  if (!newsletterId) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "Newsletter ID is required", type: "error" }
    )
  }
  
  const newsletter = await getNewsletterById(newsletterId)
  
  if (!newsletter) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "Newsletter not found", type: "error" }
    )
  }
  
  // Only allow editing draft newsletters
  if (newsletter.status !== 'draft') {
    throw await redirectWithToast(
      ADMIN_VIEW_NEWSLETTER?.(newsletterId) || ADMIN_NEWSLETTERS(),
      { message: "Only draft newsletters can be edited", type: "error" }
    )
  }
  
  return { newsletter }
}

export async function action({ request, params }: Route.ActionArgs) {
  await getAdminContext(request, params)
  
  const newsletterId = params.id
  if (!newsletterId) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "Newsletter ID is required", type: "error" }
    )
  }
  
  return formAction({
    request,
    schema: newsletterFormSchema,
    mutation: async (data) => {
      const newsletter = await updateNewsletter(newsletterId, {
        ...data,
        status: data.status || 'draft',
      })
      return { success: true, data: newsletter }
    },
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          ADMIN_VIEW_NEWSLETTER?.(newsletterId) || ADMIN_NEWSLETTERS(),
          "Newsletter updated successfully"
        )
      }
      return result
    },
  })
}

export default function AdminEditNewsletterPage({ loaderData }: Route.ComponentProps) {
  const { newsletter } = loaderData
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Edit Newsletter</h1>
        <p className="text-muted-foreground mt-2">
          Update your newsletter content and settings
        </p>
      </div>
      
      <NewsletterForm newsletter={newsletter} />
    </div>
  )
}