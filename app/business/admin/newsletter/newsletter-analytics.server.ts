import { type Kysely } from "kysely"
import type { Database } from "~types/database/kysely.types"

export interface NewsletterAnalytics {
  newsletterId: string
  totalRecipients: number
  successfulSends: number
  failedSends: number
  deliveryRate: number // percentage
  unsubscribes: number
  sendDuration: number // minutes
  averageSendTime: number // seconds per email
}

export async function getNewsletterAnalytics(
  kysely: Kysely<Database>,
  newsletterId: string
): Promise<NewsletterAnalytics> {
  // Get the newsletter details
  const newsletter = await kysely
    .selectFrom("newsletters")
    .select(["id", "sent_at", "status", "send_started_at", "send_completed_at"])
    .where("id", "=", newsletterId)
    .executeTakeFirst()

  if (!newsletter) {
    return {
      newsletterId,
      totalRecipients: 0,
      successfulSends: 0,
      failedSends: 0,
      deliveryRate: 0,
      unsubscribes: 0,
      sendDuration: 0,
      averageSendTime: 0
    }
  }

  // Get send statistics
  const sendStats = await kysely
    .selectFrom("newsletter_sends")
    .select([
      "status",
      (eb) => eb.fn.count<number>("id").as("count")
    ])
    .where("newsletter_id", "=", newsletterId)
    .groupBy("status")
    .execute()

  const successfulSends = sendStats.find(s => s.status === "sent")?.count || 0
  const failedSends = sendStats.find(s => s.status === "failed")?.count || 0
  const bouncedSends = sendStats.find(s => s.status === "bounced")?.count || 0
  const totalRecipients = Number(successfulSends) + Number(failedSends) + Number(bouncedSends)

  // Calculate delivery rate
  const deliveryRate = totalRecipients > 0
    ? Math.round((Number(successfulSends) / totalRecipients) * 10000) / 100 // Round to 2 decimals
    : 0

  // Get unsubscribe count
  const unsubscribes = await getUnsubscribeCountForNewsletter(kysely, newsletterId)

  // Calculate send duration if timing fields exist
  let sendDuration = 0
  let averageSendTime = 0
  
  if (newsletter.send_started_at && newsletter.send_completed_at) {
    const startTime = new Date(newsletter.send_started_at).getTime()
    const endTime = new Date(newsletter.send_completed_at).getTime()
    sendDuration = Math.round((endTime - startTime) / 60000 * 10) / 10 // Minutes with 1 decimal
    
    if (totalRecipients > 0) {
      averageSendTime = Math.round((endTime - startTime) / 1000 / totalRecipients) // Seconds per email
    }
  }

  return {
    newsletterId,
    totalRecipients: Number(totalRecipients),
    successfulSends: Number(successfulSends),
    failedSends: Number(failedSends) + Number(bouncedSends),
    deliveryRate,
    unsubscribes,
    sendDuration,
    averageSendTime
  }
}

export async function getUnsubscribeCountForNewsletter(
  kysely: Kysely<Database>,
  newsletterId: string
): Promise<number> {
  // Get the newsletter sent date
  const newsletter = await kysely
    .selectFrom("newsletters")
    .select("sent_at")
    .where("id", "=", newsletterId)
    .executeTakeFirst()

  if (!newsletter || !newsletter.sent_at) {
    return 0
  }

  const sentDate = new Date(newsletter.sent_at)
  const sevenDaysLater = new Date(sentDate.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get the profile IDs of recipients who received this newsletter
  const recipients = await kysely
    .selectFrom("newsletter_sends")
    .select("profile_id")
    .where("newsletter_id", "=", newsletterId)
    .where("status", "=", "sent")
    .execute()

  if (recipients.length === 0) {
    return 0
  }

  const recipientIds = recipients.map(r => r.profile_id)

  // Count unsubscribes from these recipients that occurred after the send date
  // and within 7 days of sending (to attribute them to this newsletter)
  const unsubscribeCount = await kysely
    .selectFrom("unsubscribe_logs")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("profile_id", "in", recipientIds)
    .where("unsubscribed_at", ">", sentDate.toISOString())
    .where("unsubscribed_at", "<=", sevenDaysLater.toISOString())
    .executeTakeFirst()

  return Number(unsubscribeCount?.count || 0)
}

export function generateAnalyticsCSV(
  analytics: NewsletterAnalytics,
  newsletterSubject: string
): string {
  const headers = [
    "Newsletter Subject",
    "Total Recipients",
    "Successful Sends",
    "Failed Sends",
    "Delivery Rate (%)",
    "Unsubscribes",
    "Send Duration (minutes)",
    "Average Send Time (seconds/email)"
  ]

  const data = [
    newsletterSubject,
    analytics.totalRecipients,
    analytics.successfulSends,
    analytics.failedSends,
    analytics.deliveryRate,
    analytics.unsubscribes,
    analytics.sendDuration,
    analytics.averageSendTime
  ]

  // Create CSV content
  const csvContent = [
    headers.join(","),
    data.map(value => {
      // Escape values that contain commas or quotes
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"` // Escape quotes by doubling them
      }
      return value
    }).join(",")
  ].join("\n")

  return csvContent
}