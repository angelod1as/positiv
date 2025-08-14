import { type Kysely } from "kysely"
import type { Database } from "~types/database/kysely.types"
import { processNewsletterQueue } from "./newsletter-queue-processor.server"
import { safeExecute } from "~/lib/helpers/error-handling"

interface ProcessOptions {
  maxExecutionTime?: number // milliseconds
}

interface ProcessResult {
  processedNewsletters: Array<{ id: string; subject: string }>
  totalProcessed: number
  totalFailed: number
  timeLimitReached?: boolean
}

export async function processScheduledNewsletters(
  kysely: Kysely<Database>,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const startTime = Date.now()
  const maxExecutionTime = options.maxExecutionTime || 140000 // 140 seconds (leaving 10s buffer for edge function's 150s limit)
  
  const processedNewsletters: Array<{ id: string; subject: string }> = []
  let totalProcessed = 0
  let totalFailed = 0
  let timeLimitReached = false

  try {
    // Find newsletters that are scheduled and ready to send
    const scheduledNewsletters = await kysely
      .selectFrom("newsletters")
      .selectAll()
      .where("status", "=", "scheduled")
      // Use DB-side timestamp comparison to avoid timezone issues
      .where("scheduled_at", "<=", kysely.fn<string>("now"))
      .orderBy("scheduled_at", "asc") // Process oldest first
      .execute()

    console.info(`Found ${scheduledNewsletters.length} newsletters ready to process`)

    for (const newsletter of scheduledNewsletters) {
      // Check execution time limit
      if (Date.now() - startTime > maxExecutionTime) {
        console.info("Execution time limit reached, stopping processing")
        timeLimitReached = true
        break
      }

      console.info(`Processing newsletter: ${newsletter.id} - ${newsletter.subject}`)

      // Process the newsletter queue with error handling
      const processResult = await safeExecute(() =>
        processNewsletterQueue(
          kysely,
          newsletter.id,
          undefined, // No segment filter for now (will be added later)
          {
            batchSize: 50,
            delayMs: 1000, // 1 second between emails for SES rate limit
          }
        )
      )

      if (processResult.success) {
        processedNewsletters.push({
          id: newsletter.id,
          subject: newsletter.subject,
        })
        
        totalProcessed += processResult.data.processed
        totalFailed += processResult.data.failed

        console.info(`Newsletter ${newsletter.id} processed: ${processResult.data.processed} sent, ${processResult.data.failed} failed`)
      } else {
        console.error(`Error processing newsletter ${newsletter.id}:`, processResult.error)
        
        // Mark newsletter as failed if there was a critical error
        await kysely
          .updateTable("newsletters")
          .set({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .where("id", "=", newsletter.id)
          .execute()

        totalFailed++
      }
    }

    return {
      processedNewsletters,
      totalProcessed,
      totalFailed,
      timeLimitReached,
    }
  } catch (error) {
    console.error("Error in processScheduledNewsletters:", error)
    throw error
  }
}

export async function getScheduledNewslettersCount(
  kysely: Kysely<Database>
): Promise<number> {
  const result = await kysely
    .selectFrom("newsletters")
    .select(kysely.fn.count<number>("id").as("count"))
    .where("status", "=", "scheduled")
    // Use DB-side timestamp comparison to avoid timezone issues
    .where("scheduled_at", "<=", kysely.fn<string>("now"))
    .executeTakeFirst()

  return Number(result?.count ?? 0)
}