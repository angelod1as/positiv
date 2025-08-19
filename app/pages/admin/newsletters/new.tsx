import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { applySchema } from "composable-functions"
import { z } from "zod"
import { getAdminContext } from "~/business/admin/admin.server"
import { createNewsletter } from "~/business/admin/newsletter/newsletter.server"
import { newsletterFormSchema } from "~/business/admin/newsletter/newsletter-schema"
import { NewsletterForm } from "~/components/forms/admin/newsletter-form"
import { Alert, AlertDescription } from "~/components/ui/alert"
import paths from "~/lib/paths"
import type { Route } from "./+types/new"
import { useActionData } from "react-router"

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
  console.info('[Newsletter Create] Starting mutation with data:', data)
  
  try {
    const newsletter = await createNewsletter({
      ...data,
      created_by: context.userId,
      status: data.status || 'draft',
    })
    console.info('[Newsletter Create] Successfully created newsletter:', newsletter.id)
    return { success: true as const, data: newsletter }
  } catch (error) {
    console.error('[Newsletter Create] Error creating newsletter:', error)
    throw error
  }
})

export async function action({ request, params }: Route.ActionArgs) {
  console.info('[Newsletter Action] Processing form submission')
  
  try {
    const context = await getAdminContext(request, params)
    
    // Parse form data for debugging
    const formData = await request.clone().formData()
    const formEntries = Object.fromEntries(formData.entries())
    console.info('[Newsletter Action] Form data received:', formEntries)
    
    // Parse segment_filter if it's a JSON string
    if (formEntries.segment_filter && typeof formEntries.segment_filter === 'string') {
      try {
        formEntries.segment_filter = JSON.parse(formEntries.segment_filter)
      } catch (e) {
        console.warn('[Newsletter Action] Failed to parse segment_filter:', e)
      }
    }
    
    return formAction({
      request,
      schema: newsletterFormSchema,
      mutation: createNewsletterMutation,
      transformResult: async (result) => {
        console.info('[Newsletter Action] Transform result:', result)
        
        if (result.success) {
          console.info('[Newsletter Action] Success! Redirecting...')
          throw await redirectWithSuccess(
            ADMIN_NEWSLETTERS(),
            "Newsletter created successfully"
          )
        }
        
        // Log validation errors if any
        if (!result.success && 'errors' in result) {
          console.error('[Newsletter Action] Validation errors:', result.errors)
        }
        
        return result
      },
      context,
    })
  } catch (error) {
    console.error('[Newsletter Action] Unexpected error:', error)
    throw error
  }
}

export default function AdminNewNewsletterPage() {
  const actionData = useActionData<typeof action>()
  
  // Log action data for debugging
  if (actionData) {
    console.info('[Newsletter Page] Action data:', actionData)
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Create Newsletter</h1>
        <p className="text-muted-foreground mt-2">
          Create a new newsletter to send to your community members
        </p>
      </div>
      
      {/* Show validation errors if any */}
      {actionData && !actionData.success && 'errors' in actionData && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Please fix the following errors:</strong>
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
            An error occurred while creating the newsletter. Please try again.
          </AlertDescription>
        </Alert>
      )}
      
      <NewsletterForm />
    </div>
  )
}