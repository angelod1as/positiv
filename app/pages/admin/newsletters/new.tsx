import { redirectWithSuccess, redirectWithToast } from "remix-toast"
import { getAdminContext } from "~/business/admin/admin.server"
import { createNewsletter } from "~/business/admin/newsletter/newsletter.server"
import { getSegmentDescriptions } from "~/business/admin/newsletter/newsletter-segments.server"
import { newsletterFormSchema } from "~/business/admin/newsletter/newsletter-schema"
import { NewsletterFormWithPreview } from "~/components/forms/admin/newsletter-form-with-preview"
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

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)
  
  try {
    const formData = await request.formData()
    const rawData = Object.fromEntries(formData)
    
    // Parse the form data with the schema
    const parseResult = newsletterFormSchema.safeParse({
      subject: rawData.subject,
      template_name: rawData.template_name,
      content_mdx: rawData.content_mdx,
      scheduled_at: rawData.scheduled_at || undefined,
      segment_type: rawData.segment_type || 'all',
      exclude_rejected: rawData.exclude_rejected === 'true',
    })
    
    if (!parseResult.success) {
      return { 
        success: false, 
        errors: parseResult.error.flatten().fieldErrors 
      }
    }
    
    const data = parseResult.data
    
    // Convert segment_type to segment_filter
    const segmentFilter: Record<string, unknown> = {
      excludeRejected: data.exclude_rejected ?? true
    }
    
    switch (data.segment_type) {
      case 'admins':
        segmentFilter.adminsOnly = true
        break
      case 'veterans':
        segmentFilter.veteransOnly = true
        break
      case 'newbies':
        segmentFilter.newbiesOnly = true
        break
      case 'new_registrations_30d':
        segmentFilter.newRegistrations = true
        break
      case 'applied_never_attended':
        segmentFilter.appliedNeverAttended = true
        break
      case 'all':
      default:
        // No additional filters for 'all'
        break
    }
    
    await createNewsletter({
      subject: data.subject,
      template_name: data.template_name,
      content_mdx: data.content_mdx,
      scheduled_at: data.scheduled_at,
      created_by: context.currentProfile?.id || '',
      status: data.scheduled_at ? 'scheduled' : 'draft',
      segment_filter: segmentFilter,
      exclude_rejected: data.exclude_rejected,
    })
    
    throw await redirectWithSuccess(
      ADMIN_NEWSLETTERS(),
      "Newsletter criada com sucesso"
    )
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }
    
    console.error('Error creating newsletter:', error)
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      {
        message: 'Erro ao criar newsletter',
        type: 'error'
      }
    )
  }
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
      
      <NewsletterFormWithPreview />
      
      {/* Segment descriptions table */}
      <SegmentTable segments={segments} />
    </div>
  )
}