import type { ActionFunctionArgs } from "react-router"
import { getAdminContext } from "~/business/admin/admin.server"
import { sendNewsletterNow } from "~/business/admin/newsletter/newsletter.server"

export async function action({ request, params }: ActionFunctionArgs) {
  // Verify admin authentication
  await getAdminContext(request, params)
  
  const newsletterId = params.id
  
  if (!newsletterId) {
    return Response.json(
      { error: "Newsletter ID is required" },
      { status: 400 }
    )
  }
  
  try {
    const result = await sendNewsletterNow(newsletterId)
    
    return Response.json({
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      newsletterId: result.newsletterId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred"
    
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}