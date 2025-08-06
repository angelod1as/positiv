import { db } from "~/lib/supabase/db.server"

interface CreateNewsletterData {
  subject: string
  template_name: string
  content_mdx: string
  status?: "draft" | "scheduled" | "sending" | "sent" | "failed"
  scheduled_at?: string
  sent_at?: string
  created_by: string
}

interface CreateNewsletterSendData {
  newsletter_id: string
  profile_id: string
  status: "sent" | "failed" | "bounced"
  error_message?: string
}

interface AddToQueueData {
  newsletter_id: string
  profile_id: string
  status: "pending" | "processing" | "sent" | "failed"
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

export async function getNewslettersByStatus(status: string) {
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
      sent_at: new Date().toISOString()
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