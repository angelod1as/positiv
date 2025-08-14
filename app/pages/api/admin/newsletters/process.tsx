import type { ActionFunctionArgs } from "react-router"
import { processScheduledNewsletters } from "~/business/admin/newsletter/newsletter-scheduler.server"
import { db } from "~/lib/supabase/db.server"

export async function action({ request }: ActionFunctionArgs) {
  // Check authorization - only service role or admin should be able to trigger this
  const authHeader = request.headers.get("authorization")
  
  if (!authHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // In production, validate this is coming from Supabase service role
  // For now, we'll accept any Bearer token for development
  if (!authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Invalid authorization header" }, { status: 401 })
  }

  try {
    // Process scheduled newsletters
    const result = await processScheduledNewsletters(db, {
      maxExecutionTime: 140000, // 140 seconds (leaving buffer for edge function's 150s limit)
    })

    return Response.json({
      success: true,
      processedNewsletters: result.processedNewsletters,
      totalProcessed: result.totalProcessed,
      totalFailed: result.totalFailed,
      timeLimitReached: result.timeLimitReached,
    })
  } catch (error) {
    console.error("Error processing newsletters:", error)
    return Response.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      },
      { status: 500 }
    )
  }
}

// GET method for health check
export async function loader() {
  return Response.json({ 
    status: "ok",
    message: "Newsletter processor endpoint is available",
  })
}