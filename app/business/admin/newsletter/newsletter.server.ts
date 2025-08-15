import { db } from "~/lib/supabase/db.server"
import { processNewsletterQueue } from "./newsletter-queue-processor.server"

export type NewsletterStatus = "draft" | "scheduled" | "sending" | "sent" | "failed"
export type NewsletterSendStatus = "sent" | "failed" | "bounced"
export type NewsletterQueueStatus = "pending" | "processing" | "sent" | "failed"

interface CreateNewsletterData {
  subject: string
  template_name: string
  content_mdx: string
  status?: NewsletterStatus
  scheduled_at?: string
  sent_at?: string
  created_by: string
  segment_filter?: Record<string, unknown>
  exclude_rejected?: boolean
}

interface CreateNewsletterSendData {
  newsletter_id: string
  profile_id: string
  status: NewsletterSendStatus
  error_message?: string
}

interface AddToQueueData {
  newsletter_id: string
  profile_id: string
  status: NewsletterQueueStatus
}

export async function createNewsletter(data: CreateNewsletterData) {
  const result = await db
    .insertInto("newsletters")
    .values({
      subject: data.subject,
      template_name: data.template_name,
      content_mdx: data.content_mdx,
      scheduled_at: data.scheduled_at,
      sent_at: data.sent_at,
      created_by: data.created_by,
      status: data.status || "draft",
      segment_filter: data.segment_filter ? JSON.stringify(data.segment_filter) : null,
      exclude_rejected: data.exclude_rejected ?? true,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return result
}

export async function getNewsletterById(id: string) {
  const result = await db
    .selectFrom("newsletters")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst()

  return result
}

export async function getNewslettersByStatus(status: NewsletterStatus) {
  const results = await db
    .selectFrom("newsletters")
    .selectAll()
    .where("status", "=", status)
    .execute()

  return results
}

export async function createNewsletterSend(data: CreateNewsletterSendData) {
  const result = await db
    .insertInto("newsletter_sends")
    .values({
      ...data,
      id: crypto.randomUUID(),
      sent_at: new Date().toISOString() // Always set sent_at, even for failed sends
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return result
}

export async function addToQueue(data: AddToQueueData) {
  const result = await db
    .insertInto("newsletter_queue")
    .values({
      ...data,
      id: crypto.randomUUID(),
      attempts: 0,
      created_at: new Date().toISOString()
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return result
}

export async function getQueueEntry(id: string) {
  const result = await db
    .selectFrom("newsletter_queue")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst()

  return result
}

export async function getAllNewslettersWithCounts() {
  // First get all newsletters
  const newsletters = await db
    .selectFrom("newsletters")
    .selectAll()
    .orderBy("created_at", "desc")
    .execute()

  // Then get recipient counts in a separate optimized query
  const recipientCounts = await db
    .selectFrom("newsletter_sends")
    .select([
      "newsletter_id",
      (eb) => eb.fn.count<number>("id").as("count")
    ])
    .groupBy("newsletter_id")
    .execute()

  // Create a map for O(1) lookup
  const countMap = new Map(
    recipientCounts.map(r => [r.newsletter_id, Number(r.count)])
  )

  // Combine the data
  return newsletters.map(newsletter => ({
    ...newsletter,
    status: newsletter.status as NewsletterStatus,
    recipient_count: countMap.get(newsletter.id) || 0
  }))
}

interface UpdateNewsletterData {
  subject?: string
  template_name?: string
  content_mdx?: string
  status?: NewsletterStatus
  scheduled_at?: string
  segment_filter?: Record<string, unknown>
  exclude_rejected?: boolean
}

export async function updateNewsletter(id: string, data: UpdateNewsletterData) {
  // First check if newsletter exists and is in draft status
  const existing = await db
    .selectFrom("newsletters")
    .select("status")
    .where("id", "=", id)
    .executeTakeFirst()
  
  if (!existing) {
    throw new Error("Newsletter not found")
  }
  
  if (existing.status !== "draft") {
    throw new Error("Only draft newsletters can be updated")
  }
  
  const updateData: Record<string, string | boolean | null> = {
    updated_at: new Date().toISOString()
  }
  
  if (data.subject !== undefined) updateData.subject = data.subject
  if (data.template_name !== undefined) updateData.template_name = data.template_name
  if (data.content_mdx !== undefined) updateData.content_mdx = data.content_mdx
  if (data.status !== undefined) updateData.status = data.status
  if (data.scheduled_at !== undefined) updateData.scheduled_at = data.scheduled_at
  if (data.segment_filter !== undefined) updateData.segment_filter = JSON.stringify(data.segment_filter)
  if (data.exclude_rejected !== undefined) updateData.exclude_rejected = data.exclude_rejected
  
  const result = await db
    .updateTable("newsletters")
    .set(updateData)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst()
  
  return result
}

interface SendNewsletterNowResult {
  success: boolean
  processed: number
  failed: number
  newsletterId: string
}

export async function sendNewsletterNow(newsletterId: string): Promise<SendNewsletterNowResult> {
  // Check if newsletter exists
  const newsletter = await getNewsletterById(newsletterId)
  
  if (!newsletter) {
    throw new Error("Newsletter not found")
  }
  
  // Only allow sending draft newsletters immediately
  if (newsletter.status !== "draft") {
    throw new Error("Only draft newsletters can be sent immediately")
  }
  
  // Update status to sending
  await db
    .updateTable("newsletters")
    .set({
      status: "sending",
      updated_at: new Date().toISOString()
    })
    .where("id", "=", newsletterId)
    .execute()
  
  try {
    // Process the newsletter queue
    const result = await processNewsletterQueue(
      db,
      newsletterId,
      undefined, // No segment filter for now
      {
        batchSize: 50,
        delayMs: 0 // No delay for immediate send in tests
      }
    )
    
    // Update status to sent if successful
    const finalStatus = result.failed === 0 && result.processed > 0 ? "sent" : 
                       result.processed === 0 ? "failed" : "sent"
    
    await db
      .updateTable("newsletters")
      .set({
        status: finalStatus,
        sent_at: finalStatus === "sent" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .where("id", "=", newsletterId)
      .execute()
    
    return {
      success: finalStatus === "sent",
      processed: result.processed,
      failed: result.failed,
      newsletterId
    }
  } catch (error) {
    // Update status to failed on error
    await db
      .updateTable("newsletters")
      .set({
        status: "failed",
        updated_at: new Date().toISOString()
      })
      .where("id", "=", newsletterId)
      .execute()
    
    throw error
  }
}