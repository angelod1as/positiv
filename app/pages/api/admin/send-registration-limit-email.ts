import { type ActionFunctionArgs } from "react-router"
import { sendRegistrationLimitAdminMail } from "~/business/admin/send-registration-limit-admin-mail.server"
import { getAdminEmails } from "~/business/admin/get-admin-emails.server"
import { db } from "~/lib/supabase/db.server"

export async function action({ request }: ActionFunctionArgs) {
  try {
    const internalJobSecret = process.env.INTERNAL_JOB_SECRET
    const authHeader = request.headers.get("Authorization")

    if (!internalJobSecret || authHeader !== `Bearer ${internalJobSecret}`) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { eventId } = body

    if (!eventId || typeof eventId !== "string") {
      return Response.json({ success: false, error: "eventId is required" }, { status: 400 })
    }

    const alreadyNotified = await db
      .selectFrom("event_registration_limit_emails")
      .select("id")
      .where("event_id", "=", eventId)
      .executeTakeFirst()

    if (alreadyNotified) {
      return Response.json({ success: true, message: "Notification already sent" }, { status: 200 })
    }

    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirst()

    if (!event) {
      return Response.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    const participantCount = await db
      .selectFrom("event_participants")
      .where("event_id", "=", eventId)
      .where("is_user_applied", "=", true)
      .select(db.fn.count("id").as("count"))
      .executeTakeFirstOrThrow()

    const count = Number(participantCount.count)

    const { emailSent } = await sendRegistrationLimitAdminMail({
      event,
      participantCount: count,
      timestamp: new Date(),
    })

    if (!emailSent) {
      return Response.json({ success: false, error: "Failed to send email" }, { status: 500 })
    }

    const adminEmails = await getAdminEmails()

    await db
      .insertInto("event_registration_limit_emails")
      .values({
        event_id: eventId,
        admin_emails: adminEmails,
      })
      .onConflict((oc) => oc.doNothing())
      .execute()

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error in send-registration-limit-email API:", error)
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
