import { redirectWithSuccess, redirectWithToast } from "remix-toast"
import { useFetcher } from "react-router"
import { getAdminContext } from "~/business/admin/admin.server"
import { getNewsletterById, updateNewsletter, sendNewsletterNow } from "~/business/admin/newsletter/newsletter.server"
import { newsletterFormSchema, type SegmentFilter } from "~/business/admin/newsletter/newsletter-schema"
import { NewsletterFormWithPreview } from "~/components/forms/admin/newsletter-form-with-preview"
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
      { message: "ID da newsletter é obrigatório", type: "error" }
    )
  }
  
  const newsletter = await getNewsletterById(newsletterId)
  
  if (!newsletter) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "Newsletter não encontrada", type: "error" }
    )
  }
  
  // Only allow editing draft newsletters
  if (newsletter.status !== 'draft') {
    throw await redirectWithToast(
      ADMIN_VIEW_NEWSLETTER(newsletterId),
      { message: "Apenas newsletters em rascunho podem ser editadas", type: "error" }
    )
  }
  
  return { 
    newsletter: {
      ...newsletter,
      segment_filter: newsletter.segment_filter as SegmentFilter | null,
    } 
  }
}


export async function action({ request, params }: Route.ActionArgs) {
  await getAdminContext(request, params)
  
  const newsletterId = params.id
  if (!newsletterId) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "ID da newsletter é obrigatório", type: "error" }
    )
  }
  
  // Clone the request to check for intent without consuming the body
  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()
  const intent = formData.get('intent')
  
  // Handle Send Now action
  if (intent === 'send-now') {
    try {
      const result = await sendNewsletterNow(newsletterId)
      throw await redirectWithSuccess(
        ADMIN_VIEW_NEWSLETTER(newsletterId),
        `Newsletter enviada com sucesso! ${result.processed} emails enviados.`
      )
    } catch (error) {
      if (error instanceof Response) throw error
      throw await redirectWithToast(
        ADMIN_VIEW_NEWSLETTER(newsletterId),
        { 
          message: error instanceof Error ? error.message : "Falha ao enviar newsletter", 
          type: "error" 
        }
      )
    }
  }
  
  // Handle Update action
  try {
    const data = await request.formData()
    const rawData = Object.fromEntries(data)
    
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
    
    const parsedData = parseResult.data
    
    // Convert segment_type to segment_filter
    const segmentFilter: Record<string, unknown> = {
      excludeRejected: parsedData.exclude_rejected ?? true
    }
    
    switch (parsedData.segment_type) {
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
    
    await updateNewsletter(newsletterId, {
      subject: parsedData.subject,
      template_name: parsedData.template_name,
      content_mdx: parsedData.content_mdx,
      scheduled_at: parsedData.scheduled_at,
      status: 'draft',
      segment_filter: segmentFilter,
      exclude_rejected: parsedData.exclude_rejected,
    })
    
    throw await redirectWithSuccess(
      ADMIN_VIEW_NEWSLETTER(newsletterId),
      "Newsletter atualizada com sucesso"
    )
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }
    
    console.error('Error updating newsletter:', error)
    throw await redirectWithToast(
      ADMIN_VIEW_NEWSLETTER(newsletterId),
      {
        message: 'Erro ao atualizar newsletter',
        type: 'error'
      }
    )
  }
}

export default function AdminEditNewsletterPage({ loaderData }: Route.ComponentProps) {
  const { newsletter } = loaderData
  const fetcher = useFetcher()
  
  const handleSendNow = (_newsletterId: string) => {
    if (confirm("Tem certeza que deseja enviar esta newsletter imediatamente para todos os inscritos?")) {
      fetcher.submit(
        { intent: 'send-now' },
        { method: 'post' }
      )
    }
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Editar Newsletter</h1>
        <p className="text-muted-foreground mt-2">
          Atualize o conteúdo e configurações da sua newsletter
        </p>
      </div>
      
      <NewsletterFormWithPreview 
        newsletter={newsletter} 
        onSendNow={handleSendNow}
      />
    </div>
  )
}