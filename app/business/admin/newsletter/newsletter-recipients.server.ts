import { type Kysely, sql } from "kysely"
import type { Database } from "~types/database/kysely.types"

export interface SegmentFilter {
  veteransOnly?: boolean
  newbiesOnly?: boolean
  gender?: string
  orientation?: string
  minEventCount?: number
  maxEventCount?: number
}

export interface NewsletterRecipient {
  id: string
  email: string
  full_name: string | null
  is_veteran: boolean | null
  gender: string[] | null
  orientation: string[] | null
}

export async function getEligibleRecipients(
  kysely: Kysely<Database>,
  filter?: SegmentFilter
): Promise<NewsletterRecipient[]> {
  let query = kysely
    .selectFrom("profiles")
    .select([
      "id",
      "email",
      "full_name",
      "is_veteran",
      "gender",
      "orientation",
    ])
    .where("allow_marketing_email", "=", true)
    .where("email", "is not", null)

  // Apply segmentation filters
  if (filter) {
    if (filter.veteransOnly === true) {
      query = query.where("is_veteran", "=", true)
    }
    if (filter.newbiesOnly === true) {
      query = query.where("is_veteran", "=", false)
    }
    if (filter.gender) {
      // Gender is an array, so we use the @> operator to check if it contains the value
      query = query.where(sql<boolean>`gender @> ARRAY[${filter.gender}]::text[]`)
    }
    if (filter.orientation) {
      // Orientation is an array, so we use the @> operator to check if it contains the value
      query = query.where(sql<boolean>`orientation @> ARRAY[${filter.orientation}]::text[]`)
    }
  }

  const recipients = await query.execute()
  
  // Filter out any recipients without email (type safety)
  return recipients.filter((r): r is NewsletterRecipient => 
    r.email !== null
  ) as NewsletterRecipient[]
}

export async function getRecipientCount(
  kysely: Kysely<Database>,
  filter?: SegmentFilter
): Promise<number> {
  let query = kysely
    .selectFrom("profiles")
    .select(kysely.fn.countAll().as("count"))
    .where("allow_marketing_email", "=", true)
    .where("email", "is not", null)

  // Apply segmentation filters
  if (filter) {
    if (filter.veteransOnly === true) {
      query = query.where("is_veteran", "=", true)
    }
    if (filter.newbiesOnly === true) {
      query = query.where("is_veteran", "=", false)
    }
    if (filter.gender) {
      // Gender is an array, so we use the @> operator to check if it contains the value
      query = query.where(sql<boolean>`gender @> ARRAY[${filter.gender}]::text[]`)
    }
    if (filter.orientation) {
      // Orientation is an array, so we use the @> operator to check if it contains the value
      query = query.where(sql<boolean>`orientation @> ARRAY[${filter.orientation}]::text[]`)
    }
  }

  const result = await query.executeTakeFirst()
  return Number(result?.count ?? 0)
}