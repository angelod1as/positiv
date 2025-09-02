import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { applySchema } from "composable-functions"
import { z } from "zod"
import { getAdminContext } from "~/business/admin/admin.server"
import { createNewsletter } from "~/business/admin/newsletter/newsletter.server"
import { getSegmentDescriptions } from "~/business/admin/newsletter/newsletter-segments.server"
import { newsletterFormSchema } from "~/business/admin/newsletter/newsletter-schema"
import { NewsletterForm } from "~/components/forms/admin/newsletter-form"
import { SegmentTable } from "~/components/organisms/newsletter/segment-table"
import { Alert, AlertDescription } from "~/components/ui/alert"
import paths from "~/lib/paths"
import { db } from "~/lib/supabase/db.server"
import type { Route } from "./+types/new"
import { useActionData, useLoaderData } from "react-router"

const {
  admin: {
    newsletters: { ADMIN_NEWSLETTERS },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const context = await getAdminContext(request, params)
  
  try {
    const segments = await getSegmentDescriptions(db)
    return {
      ...context,
      segments
    }
  } catch (error) {
    console.error('Failed to load segment descriptions:', error)
    return {
      ...context,
      segments: []
    }
  }
}

const createNewsletterMutation = applySchema(
  newsletterFormSchema,
  z.object({ profileId: z.string() })
)(async (data, context) => {
  // Validate context
  if (!context?.profileId) {
    throw new Error('Profile ID is required')
  }
  
  // Convert segment_type to segment_filter
  const segmentFilter: Record<string, unknown> = {
    excludeRejected: data.exclude_rejected ?? true
  }
  
  switch (data.segment_type) {
    case 'veterans':
      segmentFilter.veteransOnly = true
      break
    case 'newbies':
      segmentFilter.newbiesOnly = true
      break
    case 'never_attended':
      segmentFilter.activityType = 'never_attended'
      break
    case 'has_attended':
      segmentFilter.activityType = 'has_attended'
      break
    case 'never_applied':
      segmentFilter.activityType = 'never_applied'
      break
    case 'applied_never_attended':
      segmentFilter.activityType = 'applied_never_attended'
      break
    case 'all':
    default:
      // No additional filters for 'all'
      break
  }
  
  const newsletter = await createNewsletter({
    subject: data.subject,
    template_name: data.template_name,
    content_mdx: data.content_mdx,
    scheduled_at: data.scheduled_at,
    created_by: context.profileId,
    status: data.status || 'draft',
    segment_filter: segmentFilter,
    exclude_rejected: data.exclude_rejected,
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
          "Newsletter criada com sucesso"
        )
      }
      return result
    },
    context: { profileId: context.currentProfile?.id || '' },
  })
}

export default function AdminNewNewsletterPage() {
  const actionData = useActionData<typeof action>()
  const { segments } = useLoaderData<typeof loader>()
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Criar Newsletter</h1>
        <p className="text-muted-foreground mt-2">
          Crie uma nova newsletter para enviar aos membros da sua comunidade
        </p>
      </div>
      
      {/* Show validation errors if any */}
      {actionData && !actionData.success && 'errors' in actionData && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Por favor, corrija os seguintes erros:</strong>
            <ul className="list-disc list-inside mt-2">
              {Object.entries(actionData.errors).map(([field, error]) => (
                <li key={field}>
                  <strong>{field}:</strong> {String(error)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Show general error if something went wrong */}
      {actionData && !actionData.success && !('errors' in actionData) && (
        <Alert variant="destructive">
          <AlertDescription>
            Ocorreu um erro ao criar a newsletter. Por favor, tente novamente.
          </AlertDescription>
        </Alert>
      )}
      
      <NewsletterForm />
      
      {/* Segment descriptions table */}
      <SegmentTable segments={segments} />
    </div>
  )
}