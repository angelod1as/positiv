import { db } from "~/lib/supabase/db.server"
import type { SegmentFilter } from "./newsletter-recipients.server"

export interface NewsletterWithMetadata {
  id: string
  subject: string
  template_name: string
  content_mdx: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  segment_filter: string | null
  exclude_rejected: boolean
  expected_recipient_count: number | null
  send_started_at: string | null
  send_completed_at: string | null
  total_recipients: number | null
  successful_sends: number | null
  failed_sends: number | null
  creator_name?: string | null
  creator_email?: string | null
}

export async function getNewsletterWithMetadata(id: string): Promise<NewsletterWithMetadata | null> {
  const result = await db
    .selectFrom("newsletters as n")
    .leftJoin("profiles as p", "p.id", "n.created_by")
    .select([
      "n.id",
      "n.subject",
      "n.template_name",
      "n.content_mdx",
      "n.status",
      "n.scheduled_at",
      "n.sent_at",
      "n.created_at",
      "n.updated_at",
      "n.created_by",
      "n.segment_filter",
      "n.exclude_rejected",
      "n.expected_recipient_count",
      "n.send_started_at",
      "n.send_completed_at",
      "n.total_recipients",
      "n.successful_sends",
      "n.failed_sends",
      "p.full_name as creator_name",
      "p.email as creator_email"
    ])
    .where("n.id", "=", id)
    .executeTakeFirst()

  if (!result) {
    return null
  }

  return {
    ...result,
    segment_filter: result.segment_filter as string | null,
  }
}

export function formatSegmentDescription(segmentFilter: string | null | undefined, excludeRejected: boolean = true): string {
  if (!segmentFilter) {
    return excludeRejected ? "Todos os inscritos (excluindo rejeitados)" : "Todos os inscritos"
  }

  let filter: SegmentFilter
  try {
    filter = typeof segmentFilter === 'string' ? JSON.parse(segmentFilter) : segmentFilter
  } catch {
    return "Configuração inválida"
  }

  const segments: string[] = []

  // Check for veteran/newbie filters
  if (filter.veteransOnly) {
    segments.push("Veteranos")
  } else if (filter.newbiesOnly) {
    segments.push("Novatos")
  }

  // Check for activity type filters
  if (filter.activityType) {
    switch (filter.activityType) {
      case 'never_attended':
        segments.push("Nunca participou")
        break
      case 'has_attended':
        segments.push("Já participou")
        break
      case 'never_applied':
        segments.push("Nunca se inscreveu")
        break
      case 'applied_never_attended':
        segments.push("Se inscreveu mas nunca participou")
        break
    }
  }

  // Check for registered within days (only used with "never_applied" activity type)
  if (filter.registeredWithinDays) {
    segments.push(`Cadastrados nos últimos ${filter.registeredWithinDays} dias`)
  }

  // Check for activity status (advanced filter)
  if (filter.activityStatus) {
    switch (filter.activityStatus) {
      case 'recent':
        segments.push("Atividade recente")
        break
      case 'inactive':
        segments.push("Inativos")
        break
      case 'lapsed':
        segments.push("Abandonaram")
        break
    }
  }

  // Check for event attendance count
  if (filter.eventAttendanceCount) {
    const { min, max, exact } = filter.eventAttendanceCount
    if (exact !== undefined) {
      segments.push(`Participou de exatamente ${exact} ${exact === 1 ? 'evento' : 'eventos'}`)
    } else if (min !== undefined && max !== undefined) {
      segments.push(`Participou de ${min} a ${max} eventos`)
    } else if (min !== undefined) {
      segments.push(`Participou de pelo menos ${min} ${min === 1 ? 'evento' : 'eventos'}`)
    } else if (max !== undefined) {
      segments.push(`Participou de no máximo ${max} ${max === 1 ? 'evento' : 'eventos'}`)
    }
  }

  // Check for inactivity period
  if (filter.inactivityPeriodDays) {
    segments.push(`Não participou nos últimos ${filter.inactivityPeriodDays} dias`)
  }

  // Check for admins only filter
  if (filter.adminsOnly) {
    segments.push("Apenas administradores")
  }

  const baseDescription = segments.length > 0 ? segments.join(", ") : "Todos os inscritos"
  const rejectedSuffix = (filter.excludeRejected ?? excludeRejected) ? " (excluindo rejeitados)" : ""
  
  return baseDescription + rejectedSuffix
}

export function formatSenderName(creatorName: string | null | undefined, creatorEmail: string | null | undefined): string {
  if (creatorName) {
    return creatorName
  }
  if (creatorEmail) {
    return creatorEmail.split('@')[0] // Use email prefix as fallback
  }
  return "Sistema"
}