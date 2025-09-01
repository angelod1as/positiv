import type { ActionFunctionArgs } from "react-router"
import { processScheduledNewsletters } from "~/business/admin/newsletter/newsletter-scheduler.server"
import { db } from "~/lib/supabase/db.server"
import { safeExecute, handleApiError } from "~/lib/helpers/error-handling"

export async function action({ request }: ActionFunctionArgs) {
  const authHeader = request.headers.get("authorization") || ""
  const expectedToken = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!authHeader.startsWith("Bearer ") || !expectedToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const providedToken = authHeader.replace(/^Bearer\s+/i, "")
  if (providedToken !== expectedToken) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = await safeExecute(() => 
    processScheduledNewsletters(db, {
      maxExecutionTime: 140000,
    })
  )

  if (result.success) {
    return Response.json({
      success: true,
      processedNewsletters: result.data.processedNewsletters,
      totalProcessed: result.data.totalProcessed,
      totalFailed: result.data.totalFailed,
      timeLimitReached: result.data.timeLimitReached,
    })
  }

  return handleApiError(result.error)
}

export async function loader() {
  return Response.json({ 
    status: "ok",
    message: "Newsletter processor endpoint is available",
  })
}