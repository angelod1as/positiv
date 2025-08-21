import { db } from "~/lib/supabase/db.server"

export async function deleteNewsletter(id: string) {
  const newsletter = await db
    .selectFrom("newsletters")
    .select(["id", "status"])
    .where("id", "=", id)
    .executeTakeFirst()
  
  if (!newsletter) {
    throw new Error("Newsletter not found")
  }
  
  if (newsletter.status !== "draft") {
    throw new Error("Only draft newsletters can be deleted")
  }
  
  // Delete related records first (if any exist)
  await db
    .deleteFrom("newsletter_queue")
    .where("newsletter_id", "=", id)
    .execute()
  
  await db
    .deleteFrom("newsletter_sends")
    .where("newsletter_id", "=", id)
    .execute()
  
  // Delete the newsletter
  await db
    .deleteFrom("newsletters")
    .where("id", "=", id)
    .executeTakeFirstOrThrow()
  
  return { success: true }
}