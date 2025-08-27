import type { ActionFunctionArgs } from "react-router"
import { processScheduledNewsletters } from "~/business/admin/newsletter/newsletter-scheduler.server"
import { db } from "~/lib/supabase/db.server"
import { safeExecute, handleApiError } from "~/lib/helpers/error-handling"

export async function action({ request }: ActionFunctionArgs) {
  // Validate the internal job token for security
  const internalToken = request.headers.get("x-internal-job-token") || ""
  const expectedToken = process.env.INTERNAL_JOB_SECRET
  
  // Uniform 401 response for all authentication failures to prevent token oracle attacks
  if (!internalToken || !expectedToken || internalToken !== expectedToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Process scheduled newsletters using composable error handling
  const result = await safeExecute(() => 
    processScheduledNewsletters(db, {
      maxExecutionTime: 140000, // 140 seconds (leaving buffer for edge function's 150s limit)
    })
  )

  if (result.success) {
    return Response.json({
      success: true,
      totalProcessed: result.data.totalProcessed,
      totalFailed: result.data.totalFailed,
      timeLimitReached: result.data.timeLimitReached,
    })
  }

  return handleApiError(result.error)
}

// GET method for health check
export async function loader() {
  return Response.json({ 
    status: "ok",
    message: "Newsletter processor endpoint is available",
  })
}