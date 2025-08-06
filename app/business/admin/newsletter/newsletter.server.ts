import { db } from "~/lib/supabase/db.server"

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
      ...data,
      status: data.status || "draft",
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
      sent_at: data.status === "sent" ? new Date().toISOString() : null
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
}

export async function updateNewsletter(id: string, data: UpdateNewsletterData) {
  const updateData = {
    ...data,
    updated_at: new Date().toISOString()
  }
  
  const result = await db
    .updateTable("newsletters")
    .set(updateData)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst()
  
  return result
}