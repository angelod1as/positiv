import { type Kysely } from "kysely"
import type { Database } from "~types/database/kysely.types"

export type ActivityType = 
  | "never_attended" 
  | "has_attended" 
  | "never_applied" 
  | "applied_never_attended"

export type ActivityStatus = 
  | "inactive" 
  | "recent" 
  | "lapsed"

export interface SegmentFilter {
  // Phase 1: Basic filters
  veteransOnly?: boolean
  newbiesOnly?: boolean
  activityType?: ActivityType
  registeredWithinDays?: number // Only used with activityType "never_applied"
  excludeRejected?: boolean // default: true
  
  // Phase 2: Advanced filters
  activityStatus?: ActivityStatus
  lastAttendanceRange?: {
    from?: Date
    to?: Date
  }
  eventAttendanceCount?: {
    min?: number
    max?: number
    exact?: number
  }
  inactivityPeriodDays?: number // "haven't attended in X days"
  specificEventIds?: string[] // attended these specific events
}

export interface NewsletterRecipient {
  id: string
  email: string
  full_name: string | null
  is_veteran: boolean | null
  gender: string[] | null
  orientation: string[] | null
  created_at: string
  last_attendance_date?: string | null
  attendance_count?: number // Added for Phase 2
}

export async function getEligibleRecipients(
  kysely: Kysely<Database>,
  filter?: SegmentFilter
): Promise<NewsletterRecipient[]> {
  const excludeRejected = filter?.excludeRejected ?? true
  
  // Handle activity-based filters which require different query structures
  if (filter?.activityType) {
    return getRecipientsByActivity(kysely, filter.activityType, filter, excludeRejected)
  }
  
  // Handle Phase 2 advanced filters
  if (filter?.activityStatus || filter?.lastAttendanceRange || filter?.eventAttendanceCount || filter?.specificEventIds) {
    return getAdvancedSegmentRecipients(kysely, filter, excludeRejected)
  }
  
  // Note: registeredWithinDays is only used with activityType "never_applied"
  // and is handled within getRecipientsByActivity
  
  // Standard query for basic filters
  let query = kysely
    .selectFrom("profiles")
    .select([
      "profiles.id",
      "profiles.email",
      "profiles.full_name",
      "profiles.is_veteran",
      "profiles.gender",
      "profiles.orientation",
      "profiles.created_at",
    ])
    .where("profiles.allow_marketing_email", "=", true)
    .where("profiles.email", "is not", null)
  
  // Exclude rejected participants if needed
  if (excludeRejected) {
    query = query.where((eb) => eb.or([
      eb("profiles.approved_to_attend", "is", null),
      eb("profiles.approved_to_attend", "!=", "rejected")
    ]))
  }
  
  // Apply basic segmentation filters
  if (filter) {
    if (filter.veteransOnly === true) {
      query = query.where("profiles.is_veteran", "=", true)
    }
    if (filter.newbiesOnly === true) {
      query = query.where("profiles.is_veteran", "=", false)
    }
  }
  
  const recipients = await query.execute()
  
  // Filter out any recipients without email (type safety)
  return recipients.filter((r): r is NewsletterRecipient => 
    r.email !== null
  ) as NewsletterRecipient[]
}

async function getRecipientsByActivity(
  kysely: Kysely<Database>,
  activityType: ActivityType,
  filter: SegmentFilter,
  excludeRejected: boolean
): Promise<NewsletterRecipient[]> {
  
  switch (activityType) {
    case "never_attended": {
      // Get profiles who have never attended any event
      let query = kysely
        .selectFrom("profiles")
        .leftJoin(
          "event_participants",
          (join) => join
            .onRef("event_participants.profile_id", "=", "profiles.id")
            .on("event_participants.attendance_status", "=", "attended")
        )
        .select([
          "profiles.id",
          "profiles.email",
          "profiles.full_name",
          "profiles.is_veteran",
          "profiles.gender",
          "profiles.orientation",
          "profiles.created_at",
        ])
        .where("profiles.allow_marketing_email", "=", true)
        .where("profiles.email", "is not", null)
        .where("event_participants.id", "is", null)
        .groupBy([
          "profiles.id",
          "profiles.email",
          "profiles.full_name",
          "profiles.is_veteran",
          "profiles.gender",
          "profiles.orientation",
          "profiles.created_at",
        ])
      
      // Exclude rejected if needed
      if (excludeRejected) {
        query = query.where((eb) => eb.or([
          eb("profiles.approved_to_attend", "is", null),
          eb("profiles.approved_to_attend", "!=", "rejected")
        ]))
      }
      
      // Apply veteran filter if needed
      if (filter.veteransOnly === true) {
        query = query.where("profiles.is_veteran", "=", true)
      }
      if (filter.newbiesOnly === true) {
        query = query.where("profiles.is_veteran", "=", false)
      }
      
      const recipients = await query.execute()
      return recipients.filter((r): r is NewsletterRecipient => r.email !== null) as NewsletterRecipient[]
    }
    
    case "has_attended": {
      // Get profiles who have attended at least one event
      let query = kysely
        .selectFrom("profiles")
        .select([
          "profiles.id",
          "profiles.email",
          "profiles.full_name",
          "profiles.is_veteran",
          "profiles.gender",
          "profiles.orientation",
          "profiles.created_at",
        ])
        .where("profiles.allow_marketing_email", "=", true)
        .where("profiles.email", "is not", null)
        .where((eb) => 
          eb.exists(
            eb.selectFrom("event_participants")
              .select("event_participants.id")
              .whereRef("event_participants.profile_id", "=", "profiles.id")
              .where("event_participants.attendance_status", "=", "attended")
          )
        )
      
      // Exclude rejected if needed
      if (excludeRejected) {
        query = query.where((eb) => eb.or([
          eb("profiles.approved_to_attend", "is", null),
          eb("profiles.approved_to_attend", "!=", "rejected")
        ]))
      }
      
      // Apply veteran filter if needed
      if (filter.veteransOnly === true) {
        query = query.where("profiles.is_veteran", "=", true)
      }
      if (filter.newbiesOnly === true) {
        query = query.where("profiles.is_veteran", "=", false)
      }
      
      // Use distinct to avoid duplicates
      query = query.distinct()
      
      const recipients = await query.execute()
      return recipients.filter((r): r is NewsletterRecipient => r.email !== null) as NewsletterRecipient[]
    }
    
    case "never_applied": {
      // Get profiles who never applied to any event (no event_participants records)
      let query = kysely
        .selectFrom("profiles")
        .leftJoin("event_participants", "event_participants.profile_id", "profiles.id")
        .select([
          "profiles.id",
          "profiles.email",
          "profiles.full_name",
          "profiles.is_veteran",
          "profiles.gender",
          "profiles.orientation",
          "profiles.created_at",
        ])
        .where("profiles.allow_marketing_email", "=", true)
        .where("profiles.email", "is not", null)
        .where("event_participants.id", "is", null)
        .groupBy([
          "profiles.id",
          "profiles.email",
          "profiles.full_name",
          "profiles.is_veteran",
          "profiles.gender",
          "profiles.orientation",
          "profiles.created_at",
        ])
      
      // Exclude rejected if needed
      if (excludeRejected) {
        query = query.where((eb) => eb.or([
          eb("profiles.approved_to_attend", "is", null),
          eb("profiles.approved_to_attend", "!=", "rejected")
        ]))
      }
      
      // Apply veteran filter if needed
      if (filter.veteransOnly === true) {
        query = query.where("profiles.is_veteran", "=", true)
      }
      if (filter.newbiesOnly === true) {
        query = query.where("profiles.is_veteran", "=", false)
      }
      
      // Apply registration date filter if specified
      if (filter.registeredWithinDays) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - filter.registeredWithinDays)
        query = query.where("profiles.created_at", ">=", cutoffDate.toISOString())
      }
      
      const recipients = await query.execute()
      return recipients.filter((r): r is NewsletterRecipient => r.email !== null) as NewsletterRecipient[]
    }
    
    case "applied_never_attended": {
      // Get profiles who applied but never attended any event
      const subquery = kysely
        .selectFrom("event_participants as ep_attended")
        .select("ep_attended.profile_id")
        .where("ep_attended.attendance_status", "=", "attended")
        .groupBy("ep_attended.profile_id")
      
      let query = kysely
        .selectFrom("profiles")
        .innerJoin("event_participants", "event_participants.profile_id", "profiles.id")
        .select([
          "profiles.id",
          "profiles.email",
          "profiles.full_name",
          "profiles.is_veteran",
          "profiles.gender",
          "profiles.orientation",
          "profiles.created_at",
        ])
        .where("profiles.allow_marketing_email", "=", true)
        .where("profiles.email", "is not", null)
        .where("profiles.id", "not in", subquery)
        .groupBy([
          "profiles.id",
          "profiles.email",
          "profiles.full_name",
          "profiles.is_veteran",
          "profiles.gender",
          "profiles.orientation",
          "profiles.created_at",
        ])
      
      // Exclude rejected if needed
      if (excludeRejected) {
        query = query.where((eb) => eb.or([
          eb("profiles.approved_to_attend", "is", null),
          eb("profiles.approved_to_attend", "!=", "rejected")
        ]))
      }
      
      // Apply veteran filter if needed
      if (filter.veteransOnly === true) {
        query = query.where("profiles.is_veteran", "=", true)
      }
      if (filter.newbiesOnly === true) {
        query = query.where("profiles.is_veteran", "=", false)
      }
      
      const recipients = await query.execute()
      return recipients.filter((r): r is NewsletterRecipient => r.email !== null) as NewsletterRecipient[]
    }
  }
}

// Note: This function was removed as registeredWithinDays is only used 
// with activityType "never_applied" and is handled within getRecipientsByActivity

export async function getRecipientCount(
  kysely: Kysely<Database>,
  filter?: SegmentFilter
): Promise<number> {
  const excludeRejected = filter?.excludeRejected ?? true
  
  // Handle activity-based filters with efficient COUNT queries
  if (filter?.activityType) {
    return getActivityBasedCount(kysely, filter.activityType, filter, excludeRejected)
  }
  
  // Note: registeredWithinDays is only used with activityType "never_applied"
  // and is handled within getActivityBasedCount
  
  // Standard count query for basic filters
  let query = kysely
    .selectFrom("profiles")
    .select((eb) => eb.fn.count<number>("profiles.id").as("count"))
    .where("profiles.allow_marketing_email", "=", true)
    .where("profiles.email", "is not", null)
  
  // Exclude rejected participants if needed
  if (excludeRejected) {
    query = query.where((eb) => eb.or([
      eb("profiles.approved_to_attend", "is", null),
      eb("profiles.approved_to_attend", "!=", "rejected")
    ]))
  }
  
  // Apply basic segmentation filters
  if (filter) {
    if (filter.veteransOnly === true) {
      query = query.where("profiles.is_veteran", "=", true)
    }
    if (filter.newbiesOnly === true) {
      query = query.where("profiles.is_veteran", "=", false)
    }
  }
  
  const result = await query.executeTakeFirst()
  return Number(result?.count ?? 0)
}

async function getActivityBasedCount(
  kysely: Kysely<Database>,
  activityType: ActivityType,
  filter: SegmentFilter,
  excludeRejected: boolean
): Promise<number> {
  
  switch (activityType) {
    case "never_attended": {
      let query = kysely
        .selectFrom("profiles")
        .leftJoin(
          "event_participants",
          (join) => join
            .onRef("event_participants.profile_id", "=", "profiles.id")
            .on("event_participants.attendance_status", "=", "attended")
        )
        .select((eb) => eb.fn.count<number>("profiles.id").as("count"))
        .where("profiles.allow_marketing_email", "=", true)
        .where("profiles.email", "is not", null)
        .where("event_participants.id", "is", null)
      
      if (excludeRejected) {
        query = query.where((eb) => eb.or([
          eb("profiles.approved_to_attend", "is", null),
          eb("profiles.approved_to_attend", "!=", "rejected")
        ]))
      }
      
      const result = await query.executeTakeFirst()
      return Number(result?.count ?? 0)
    }
    
    case "has_attended": {
      let query = kysely
        .selectFrom("profiles")
        .innerJoin(
          "event_participants",
          (join) => join
            .onRef("event_participants.profile_id", "=", "profiles.id")
            .on("event_participants.attendance_status", "=", "attended")
        )
        .select((eb) => eb.fn.count<number>(eb.fn("distinct", ["profiles.id"])).as("count"))
        .where("profiles.allow_marketing_email", "=", true)
        .where("profiles.email", "is not", null)
      
      if (excludeRejected) {
        query = query.where((eb) => eb.or([
          eb("profiles.approved_to_attend", "is", null),
          eb("profiles.approved_to_attend", "!=", "rejected")
        ]))
      }
      
      const result = await query.executeTakeFirst()
      return result?.count ? Number(result.count) : 0
    }
    
    case "never_applied": {
      let query = kysely
        .selectFrom("profiles")
        .leftJoin(
          "event_participants",
          (join) => join.onRef("event_participants.profile_id", "=", "profiles.id")
        )
        .select((eb) => eb.fn.count<number>("profiles.id").as("count"))
        .where("profiles.allow_marketing_email", "=", true)
        .where("profiles.email", "is not", null)
        .where("event_participants.id", "is", null)
      
      if (excludeRejected) {
        query = query.where((eb) => eb.or([
          eb("profiles.approved_to_attend", "is", null),
          eb("profiles.approved_to_attend", "!=", "rejected")
        ]))
      }
      
      if (filter.registeredWithinDays) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - filter.registeredWithinDays)
        query = query.where("profiles.created_at", ">=", cutoffDate.toISOString())
      }
      
      const result = await query.executeTakeFirst()
      return Number(result?.count ?? 0)
    }
    
    case "applied_never_attended": {
      let query = kysely
        .selectFrom("profiles")
        .innerJoin(
          "event_participants",
          (join) => join.onRef("event_participants.profile_id", "=", "profiles.id")
        )
        .select((eb) => eb.fn.count<number>(eb.fn("distinct", ["profiles.id"])).as("count"))
        .where("profiles.allow_marketing_email", "=", true)
        .where("profiles.email", "is not", null)
        .where((eb) => 
          eb.not(
            eb.exists(
              eb.selectFrom("event_participants as ep_attended")
                .select("ep_attended.id")
                .whereRef("ep_attended.profile_id", "=", "profiles.id")
                .where("ep_attended.attendance_status", "=", "attended")
            )
          )
        )
      
      if (excludeRejected) {
        query = query.where((eb) => eb.or([
          eb("profiles.approved_to_attend", "is", null),
          eb("profiles.approved_to_attend", "!=", "rejected")
        ]))
      }
      
      const result = await query.executeTakeFirst()
      return result?.count ? Number(result.count) : 0
    }
    
    default:
      return 0
  }
}

// Note: This function was removed as registeredWithinDays is only used 
// with activityType "never_applied" and is handled within getActivityBasedCount

export async function getRecipientPreview(
  kysely: Kysely<Database>,
  filter?: SegmentFilter,
  limit: number = 5
): Promise<NewsletterRecipient[]> {
  const recipients = await getEligibleRecipients(kysely, filter)
  return recipients.slice(0, limit)
}

export async function getSegmentCounts(
  kysely: Kysely<Database>
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  
  // Get count for all subscribers
  counts.all = await getRecipientCount(kysely, {})
  
  // Get count for veterans
  counts.veterans = await getRecipientCount(kysely, { veteransOnly: true })
  
  // Get count for newbies
  counts.newbies = await getRecipientCount(kysely, { newbiesOnly: true })
  
  // Get count for never attended
  counts.never_attended = await getRecipientCount(kysely, { activityType: "never_attended" })
  
  // Get count for has attended
  counts.has_attended = await getRecipientCount(kysely, { activityType: "has_attended" })
  
  // Get count for new registrations (30 days)
  counts.new_30 = await getRecipientCount(kysely, { 
    activityType: "never_applied",
    registeredWithinDays: 30 
  })
  
  // Get count for applied but never attended
  counts.applied_never = await getRecipientCount(kysely, { activityType: "applied_never_attended" })
  
  return counts
}

async function getAdvancedSegmentRecipients(
  kysely: Kysely<Database>,
  filter: SegmentFilter,
  excludeRejected: boolean
): Promise<NewsletterRecipient[]> {
  // Build base query with attendance count calculation
  let query = kysely
    .selectFrom("profiles")
    .leftJoin("event_participants", (join) => join
      .onRef("event_participants.profile_id", "=", "profiles.id")
      .on("event_participants.attendance_status", "=", "attended")
    )
    .leftJoin("events", "events.id", "event_participants.event_id")
    .select([
      "profiles.id",
      "profiles.email",
      "profiles.full_name",
      "profiles.is_veteran",
      "profiles.gender",
      "profiles.orientation",
      "profiles.created_at",
      kysely.fn.max("events.time_event_start").as("last_attendance_date"),
      kysely.fn.count<number>("event_participants.id").as("attendance_count"),
    ])
    .where("profiles.allow_marketing_email", "=", true)
    .where("profiles.email", "is not", null)
    .groupBy([
      "profiles.id",
      "profiles.email",
      "profiles.full_name",
      "profiles.is_veteran",
      "profiles.gender",
      "profiles.orientation",
      "profiles.created_at",
    ])

  // Exclude rejected participants if needed
  if (excludeRejected) {
    query = query.where((eb) => eb.or([
      eb("profiles.approved_to_attend", "is", null),
      eb("profiles.approved_to_attend", "!=", "rejected")
    ]))
  }

  // Apply veteran/newbie filters
  if (filter.veteransOnly === true) {
    query = query.where("profiles.is_veteran", "=", true)
  }
  if (filter.newbiesOnly === true) {
    query = query.where("profiles.is_veteran", "=", false)
  }

  // Handle activity status filters
  if (filter.activityStatus) {
    const now = new Date()
    
    switch (filter.activityStatus) {
      case "inactive": {
        // Profiles that attended but not in the last X days (default 180)
        const inactivityDays = filter.inactivityPeriodDays || 180
        const cutoffDate = new Date(now.getTime() - inactivityDays * 24 * 60 * 60 * 1000)
        
        query = query
          .having(kysely.fn.max("events.time_event_start"), "is not", null)
          .having(kysely.fn.max("events.time_event_start"), "<", cutoffDate.toISOString())
        break
      }
      
      case "recent": {
        // Profiles that attended recently (within specified range or last 90 days)
        let fromDate: Date
        let toDate: Date
        
        if (filter.lastAttendanceRange) {
          fromDate = filter.lastAttendanceRange.from || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          toDate = filter.lastAttendanceRange.to || now
        } else {
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          toDate = now
        }
        
        query = query
          .having(kysely.fn.max("events.time_event_start"), ">=", fromDate.toISOString())
          .having(kysely.fn.max("events.time_event_start"), "<=", toDate.toISOString())
        break
      }
      
      case "lapsed": {
        // Previously active (3+ events) but haven't attended in X days
        const inactivityDays = filter.inactivityPeriodDays || 180
        const cutoffDate = new Date(now.getTime() - inactivityDays * 24 * 60 * 60 * 1000)
        const minAttendance = filter.eventAttendanceCount?.min || 3
        
        query = query
          .having(kysely.fn.count<number>("event_participants.id"), ">=", minAttendance)
          .having(kysely.fn.max("events.time_event_start"), "<", cutoffDate.toISOString())
        break
      }
    }
  }

  // Handle custom date range filter (without activity status)
  if (!filter.activityStatus && filter.lastAttendanceRange) {
    const fromDate = filter.lastAttendanceRange.from
    const toDate = filter.lastAttendanceRange.to
    
    if (fromDate) {
      query = query.having(kysely.fn.max("events.time_event_start"), ">=", fromDate.toISOString())
    }
    if (toDate) {
      query = query.having(kysely.fn.max("events.time_event_start"), "<=", toDate.toISOString())
    }
  }

  // Handle attendance count filters
  if (filter.eventAttendanceCount) {
    if (filter.eventAttendanceCount.exact !== undefined) {
      query = query.having(kysely.fn.count<number>("event_participants.id"), "=", filter.eventAttendanceCount.exact)
    } else {
      if (filter.eventAttendanceCount.min !== undefined) {
        query = query.having(kysely.fn.count<number>("event_participants.id"), ">=", filter.eventAttendanceCount.min)
      }
      if (filter.eventAttendanceCount.max !== undefined) {
        query = query.having(kysely.fn.count<number>("event_participants.id"), "<=", filter.eventAttendanceCount.max)
      }
    }
  }

  // Handle specific event IDs filter
  if (filter.specificEventIds && filter.specificEventIds.length > 0) {
    // Use subquery to find profiles that attended specific events
    const profilesWithSpecificEvents = kysely
      .selectFrom("event_participants")
      .select("event_participants.profile_id")
      .where("event_participants.attendance_status", "=", "attended")
      .where("event_participants.event_id", "in", filter.specificEventIds)
      .groupBy("event_participants.profile_id")
    
    query = query.where("profiles.id", "in", profilesWithSpecificEvents)
  }

  const recipients = await query.execute()
  
  // Filter out any recipients without email and transform results
  return recipients
    .filter((r): r is any => r.email !== null)
    .map(r => ({
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      is_veteran: r.is_veteran,
      gender: r.gender,
      orientation: r.orientation,
      created_at: r.created_at,
      last_attendance_date: r.last_attendance_date,
      attendance_count: Number(r.attendance_count) || 0,
    }))
}