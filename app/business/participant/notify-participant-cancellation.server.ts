import { formatInTimeZone } from "date-fns-tz"
import { ENV } from "varlock/env"
import { participantCancellationAlertCopy as copy } from "~/copy/admin"
import { adminPropMapsCopy } from "~/copy/admin/prop-maps"
import { sharedCopy } from "~/copy/shared"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import type { ParticipantApplicationStatus } from "~types/database/entities.types"

const TIME_ZONE = "America/Sao_Paulo"
const TELEGRAM_TIMEOUT_MS = 5000

export interface ParticipantCancellation {
  eventId: string
  eventTitle: string
  fullName: string | null
  socialName: string | null
  email: string | null
  phone: string | null
  applicationStatus: ParticipantApplicationStatus
  cancelledAt: string
  reason: string | null
}

export async function findParticipantCancellation(
  eventParticipantId: string,
): Promise<ParticipantCancellation | undefined> {
  const row = await kyselyDb
    .selectFrom("event_participants as ep")
    .innerJoin("events as e", "e.id", "ep.event_id")
    .innerJoin("profiles as p", "p.id", "ep.profile_id")
    .select([
      "e.id as eventId",
      "e.title as eventTitle",
      "p.full_name as fullName",
      "p.social_name as socialName",
      "p.email",
      "p.phone",
      "ep.application_status as applicationStatus",
      "ep.cancellation_date as cancelledAt",
      "ep.cancellation_reason as reason",
    ])
    .where("ep.id", "=", eventParticipantId)
    .executeTakeFirst()

  if (!row || !row.cancelledAt) return undefined

  return {
    ...row,
    eventTitle: row.eventTitle ?? "",
    phone: row.phone === null ? null : String(row.phone),
    cancelledAt: row.cancelledAt,
  }
}

function buildMessage(cancellation: ParticipantCancellation): string {
  const date = formatInTimeZone(
    cancellation.cancelledAt,
    TIME_ZONE,
    "dd/MM/yyyy",
  )
  const time = formatInTimeZone(cancellation.cancelledAt, TIME_ZONE, "HH:mm")

  const lines = [
    copy.title,
    copy.event(cancellation.eventTitle),
    copy.participant(
      cancellation.fullName?.trim() || sharedCopy.values.anonymous,
      cancellation.socialName?.trim() || null,
    ),
    copy.email(cancellation.email || copy.notInformed),
    copy.phone(cancellation.phone || copy.notInformed),
    copy.status(
      adminPropMapsCopy.applicationStatus[cancellation.applicationStatus],
    ),
    copy.cancelledAt(date, time),
    ...(cancellation.reason ? [copy.reason(cancellation.reason)] : []),
    "",
    `${ENV.APP_URL}${paths.admin.events.ADMIN_VIEW_EVENT(cancellation.eventId)}`,
  ]

  return lines.join("\n")
}

// Not gated by TELEGRAM_ALERTS_ENABLED: that switch belongs to the technical
// alerts, and this goes to the editors' own group.
export async function notifyParticipantCancellation(
  cancellation: ParticipantCancellation,
): Promise<void> {
  const { TELEGRAM_BOT_TOKEN: botToken, TELEGRAM_EDITOR_CHAT_ID: chatId } = ENV

  if (!botToken || !chatId) return

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: buildMessage(cancellation),
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      },
    )

    if (!response.ok) {
      logger.error("Telegram rejected the participant cancellation notice", {
        status: response.status,
      })
      return
    }

    logger.info("Participant cancellation notified on Telegram")
  } catch (error) {
    logger.error("Failed to notify a participant cancellation on Telegram", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
