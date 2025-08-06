import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { applySchema } from "composable-functions"
import { z } from "zod"
import { getAdminContext } from "~/business/admin/admin.server"
import { createNewsletter } from "~/business/admin/newsletter/newsletter.server"
import { newsletterFormSchema } from "~/business/admin/newsletter/newsletter-schema"
import { NewsletterForm } from "~/components/forms/admin/newsletter-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/new"

const {
  admin: {
    newsletters: { ADMIN_NEWSLETTERS },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const context = await getAdminContext(request, params)
  return context
}

const createNewsletterMutation = applySchema(
  newsletterFormSchema,
  z.object({ userId: z.string() })
)(async (data, context) => {
  const newsletter = await createNewsletter({
    ...data,
    created_by: context.userId,
    status: data.status || 'draft',
  })
  return { success: true as const, data: newsletter }
})

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)
  
  return formAction({
    request,
    schema: newsletterFormSchema,
    mutation: createNewsletterMutation,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          ADMIN_NEWSLETTERS(),
          "Newsletter created successfully"
        )
      }
      return result
    },
    context,
  })
}

export default function AdminNewNewsletterPage() {
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Create Newsletter</h1>
        <p className="text-muted-foreground mt-2">
          Create a new newsletter to send to your community members
        </p>
      </div>
      
      <NewsletterForm />
    </div>
  )
}