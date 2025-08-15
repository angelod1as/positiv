import { type Kysely } from "kysely"
import type { Database } from "~types/database/kysely.types"
import { sendEmail } from "~/business/email/send-email"
import { generateUnsubscribeToken } from "./unsubscribe-tokens.server"
import { getEligibleRecipients, type SegmentFilter } from "./newsletter-recipients.server"
import { processMDXContent } from "./mdx-processor.server"
import { renderNewsletterEmail } from "./newsletter-email-renderer.server"

const MAX_RETRIES = 3
const DEFAULT_BATCH_SIZE = 50
const DEFAULT_DELAY_MS = 1000 // 1 second between emails (SES rate limit)

interface ProcessOptions {
  batchSize?: number
  delayMs?: number
}

interface ProcessResult {
  processed: number
  failed: number
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function createQueueEntriesForNewsletter(
  kysely: Kysely<Database>,
  newsletterId: string,
  segmentFilter?: SegmentFilter
): Promise<number> {
  // Get eligible recipients
  const recipients = await getEligibleRecipients(kysely, segmentFilter)
  
  if (recipients.length === 0) {
    return 0
  }

  // Check for existing queue entries to avoid duplicates
  const existingEntries = await kysely
    .selectFrom("newsletter_queue")
    .select("profile_id")
    .where("newsletter_id", "=", newsletterId)
    .execute()
  
  const existingProfileIds = new Set(existingEntries.map(e => e.profile_id))
  
  // Filter out recipients who already have queue entries
  const newRecipients = recipients.filter(r => !existingProfileIds.has(r.id))
  
  if (newRecipients.length === 0) {
    return 0
  }

  // Create queue entries for new recipients
  const queueEntries = newRecipients.map(recipient => ({
    id: crypto.randomUUID(),
    newsletter_id: newsletterId,
    profile_id: recipient.id,
    status: "pending" as const,
    attempts: 0,
    created_at: new Date().toISOString(),
    last_error: null,
    processed_at: null,
  }))

  await kysely
    .insertInto("newsletter_queue")
    .values(queueEntries)
    .execute()

  return newRecipients.length
}

export async function processQueueEntry(
  kysely: Kysely<Database>,
  queueEntryId: string
): Promise<boolean> {
  // Atomically update status to processing and get the entry
  // This prevents concurrent workers from processing the same entry
  const updatedEntry = await kysely
    .updateTable("newsletter_queue")
    .set({ status: "processing" })
    .where("id", "=", queueEntryId)
    .where("status", "=", "pending") // Only process if still pending
    .returningAll()
    .executeTakeFirst()

  if (!updatedEntry) {
    // Entry was already being processed or doesn't exist
    return false
  }

  // Get newsletter and profile details
  const entry = await kysely
    .selectFrom("newsletter_queue as nq")
    .innerJoin("newsletters as n", "n.id", "nq.newsletter_id")
    .innerJoin("profiles as p", "p.id", "nq.profile_id")
    .select([
      "nq.id",
      "nq.newsletter_id",
      "nq.profile_id",
      "nq.attempts",
      "n.subject",
      "n.template_name",
      "n.content_mdx",
      "p.email",
      "p.full_name",
    ])
    .where("nq.id", "=", queueEntryId)
    .executeTakeFirst()

  if (!entry || !entry.email) {
    console.error("No entry found or no email:", { queueEntryId, entry })
    // Reset status back to pending if we can't process
    await kysely
      .updateTable("newsletter_queue")
      .set({ status: "pending" })
      .where("id", "=", queueEntryId)
      .execute()
    return false
  }

  try {
    // Generate unsubscribe token
    const unsubscribeToken = generateUnsubscribeToken(entry.profile_id)
    const unsubscribeUrl = `${process.env.APP_URL || "http://localhost:5173"}/unsubscribe?token=${unsubscribeToken}`

    // Process MDX content
    const processedContent = await processMDXContent(entry.content_mdx)

    // Render email HTML
    const { html, text } = await renderNewsletterEmail({
      subject: entry.subject,
      templateName: entry.template_name,
      content: processedContent.html,
      unsubscribeUrl,
    })

    // Send email
    await sendEmail({
      to: entry.email,
      subject: entry.subject,
      html,
      text,
    })

    // Mark as sent
    await kysely
      .updateTable("newsletter_queue")
      .set({
        status: "sent",
        processed_at: new Date().toISOString(),
      })
      .where("id", "=", queueEntryId)
      .execute()

    // Record in newsletter_sends
    await kysely
      .insertInto("newsletter_sends")
      .values({
        id: crypto.randomUUID(),
        newsletter_id: entry.newsletter_id,
        profile_id: entry.profile_id,
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .onConflict((oc) => 
        oc.columns(["newsletter_id", "profile_id"]).doUpdateSet({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
        })
      )
      .execute()

    return true
  } catch (error) {
    console.error("Error processing queue entry:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const newAttempts = entry.attempts + 1

    if (newAttempts >= MAX_RETRIES) {
      // Mark as permanently failed
      await kysely
        .updateTable("newsletter_queue")
        .set({
          status: "failed",
          attempts: newAttempts,
          last_error: errorMessage,
          processed_at: new Date().toISOString(),
        })
        .where("id", "=", queueEntryId)
        .execute()

      // Record failure in newsletter_sends
      await kysely
        .insertInto("newsletter_sends")
        .values({
          id: crypto.randomUUID(),
          newsletter_id: entry.newsletter_id,
          profile_id: entry.profile_id,
          status: "failed",
          sent_at: new Date().toISOString(), // Set current time even for failed sends
          error_message: errorMessage,
        })
        .onConflict((oc) =>
          oc.columns(["newsletter_id", "profile_id"]).doUpdateSet({
            status: "failed",
            sent_at: new Date().toISOString(),
            error_message: errorMessage,
          })
        )
        .execute()
    } else {
      // Mark for retry
      await kysely
        .updateTable("newsletter_queue")
        .set({
          status: "pending",
          attempts: newAttempts,
          last_error: errorMessage,
        })
        .where("id", "=", queueEntryId)
        .execute()
    }

    return false
  }
}

export async function processNewsletterQueue(
  kysely: Kysely<Database>,
  newsletterId: string,
  segmentFilter?: SegmentFilter,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const { batchSize = DEFAULT_BATCH_SIZE, delayMs = DEFAULT_DELAY_MS } = options

  const sendStartedAt = new Date().toISOString()

  // Update newsletter status to sending and record start time
  await kysely
    .updateTable("newsletters")
    .set({ 
      status: "sending",
      send_started_at: sendStartedAt
    })
    .where("id", "=", newsletterId)
    .execute()

  // Create queue entries if they don't exist
  await createQueueEntriesForNewsletter(kysely, newsletterId, segmentFilter)

  let processed = 0
  let failed = 0
  let hasMore = true

  while (hasMore) {
    // Get next batch of pending queue entries
    const batch = await kysely
      .selectFrom("newsletter_queue")
      .select("id")
      .where("newsletter_id", "=", newsletterId)
      .where("status", "=", "pending")
      .limit(batchSize)
      .execute()

    if (batch.length === 0) {
      hasMore = false
      break
    }

    // Process each entry in the batch
    for (const entry of batch) {
      const success = await processQueueEntry(kysely, entry.id)
      
      if (success) {
        processed++
      } else {
        // Check if it's permanently failed
        const queueEntry = await kysely
          .selectFrom("newsletter_queue")
          .select("status")
          .where("id", "=", entry.id)
          .executeTakeFirst()
        
        if (queueEntry?.status === "failed") {
          failed++
        }
      }

      // Rate limiting delay
      if (delayMs > 0) {
        await delay(delayMs)
      }
    }
  }

  // Check if there are any remaining pending or processing entries
  const remaining = await kysely
    .selectFrom("newsletter_queue")
    .select(kysely.fn.countAll().as("count"))
    .where("newsletter_id", "=", newsletterId)
    .where("status", "in", ["pending", "processing"])
    .executeTakeFirst()

  const remainingCount = Number(remaining?.count ?? 0)
  
  // Determine final status based on remaining queue entries
  const finalStatus = remainingCount === 0
    ? (failed > 0 && processed === 0 ? "failed" : "sent")
    : "sending"
  
  const sendCompletedAt = finalStatus === "sent" || finalStatus === "failed" 
    ? new Date().toISOString() 
    : null

  // Get the total recipient count from the queue
  const totalRecipientsResult = await kysely
    .selectFrom("newsletter_queue")
    .select(kysely.fn.countAll().as("count"))
    .where("newsletter_id", "=", newsletterId)
    .executeTakeFirst()
  
  const totalRecipients = Number(totalRecipientsResult?.count ?? 0)
  
  await kysely
    .updateTable("newsletters")
    .set({
      status: finalStatus,
      sent_at: finalStatus === "sent" ? sendCompletedAt : null,
      send_completed_at: sendCompletedAt,
      total_recipients: totalRecipients,
      successful_sends: processed,
      failed_sends: failed
    })
    .where("id", "=", newsletterId)
    .execute()

  return { processed, failed }
}