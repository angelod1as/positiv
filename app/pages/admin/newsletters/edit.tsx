import { formAction } from "remix-forms"
import { redirectWithSuccess, redirectWithToast } from "remix-toast"
import { applySchema } from "composable-functions"
import { z } from "zod"
import { useFetcher } from "react-router"
import { getAdminContext } from "~/business/admin/admin.server"
import { getNewsletterById, updateNewsletter, sendNewsletterNow } from "~/business/admin/newsletter/newsletter.server"
import { newsletterFormSchema, type SegmentFilter } from "~/business/admin/newsletter/newsletter-schema"
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

const updateNewsletterMutation = applySchema(
  newsletterFormSchema,
  z.object({ newsletterId: z.string() })
)(async (data, context) => {
  const newsletter = await updateNewsletter(context.newsletterId, {
    ...data,
    status: data.status || 'draft',
  })
  return { success: true as const, data: newsletter }
})

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
  
  return formAction({
    request,
    schema: newsletterFormSchema,
    mutation: updateNewsletterMutation,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          ADMIN_VIEW_NEWSLETTER(newsletterId),
          "Newsletter atualizada com sucesso"
        )
      }
      return result
    },
    context: { newsletterId },
  })
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
      
      <NewsletterForm 
        newsletter={newsletter} 
        onSendNow={handleSendNow}
      />
    </div>
  )
}