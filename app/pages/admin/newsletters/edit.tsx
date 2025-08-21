import { formAction } from "remix-forms"
import { redirectWithSuccess, redirectWithToast } from "remix-toast"
import { applySchema } from "composable-functions"
import { z } from "zod"
import { useFetcher } from "react-router"
import { useState } from "react"
import { getAdminContext } from "~/business/admin/admin.server"
import { getNewsletterById, updateNewsletter, sendNewsletterNow } from "~/business/admin/newsletter/newsletter.server"
import { deleteNewsletter } from "~/business/admin/newsletter/delete-newsletter.server"
import { newsletterFormSchema, type SegmentFilter } from "~/business/admin/newsletter/newsletter-schema"
import { NewsletterForm } from "~/components/forms/admin/newsletter-form"
import ConfirmDialog from "~/components/molecules/confirm-dialog/confirm-dialog"
import { Button } from "~/components/ui/button"
import { Trash2 } from "lucide-react"
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
      ADMIN_VIEW_NEWSLETTER(newsletterId),
      { message: "Only draft newsletters can be edited", type: "error" }
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
      { message: "Newsletter ID is required", type: "error" }
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
        `Newsletter sent successfully! ${result.processed} emails sent.`
      )
    } catch (error) {
      if (error instanceof Response) throw error
      throw await redirectWithToast(
        ADMIN_VIEW_NEWSLETTER(newsletterId),
        { 
          message: error instanceof Error ? error.message : "Failed to send newsletter", 
          type: "error" 
        }
      )
    }
  }
  
  // Handle Delete action
  if (intent === 'delete') {
    try {
      await deleteNewsletter(newsletterId)
      throw await redirectWithSuccess(
        ADMIN_NEWSLETTERS(),
        "Newsletter deleted successfully"
      )
    } catch (error) {
      if (error instanceof Response) throw error
      throw await redirectWithToast(
        ADMIN_VIEW_NEWSLETTER(newsletterId),
        { 
          message: error instanceof Error ? error.message : "Failed to delete newsletter", 
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
          "Newsletter updated successfully"
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const handleSendNow = (_newsletterId: string) => {
    if (confirm("Are you sure you want to send this newsletter immediately to all subscribers?")) {
      fetcher.submit(
        { intent: 'send-now' },
        { method: 'post' }
      )
    }
  }
  
  const handleDelete = () => {
    setShowDeleteDialog(true)
  }
  
  const confirmDelete = (closeDialog: () => void) => {
    fetcher.submit(
      { intent: 'delete' },
      { method: 'post' }
    )
    closeDialog()
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Newsletter</h1>
          <p className="text-muted-foreground mt-2">
            Update your newsletter content and settings
          </p>
        </div>
        
        {newsletter.status === 'draft' && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Newsletter
          </Button>
        )}
      </div>
      
      <NewsletterForm 
        newsletter={newsletter} 
        onSendNow={handleSendNow}
      />
      
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Newsletter?"
        description="This action cannot be undone. This will permanently delete this newsletter."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  )
}