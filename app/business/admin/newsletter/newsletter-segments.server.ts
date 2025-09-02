import type { Kysely } from "kysely"
import type { Database } from "~/types/database/kysely.types"

export interface SegmentDescription {
  segment_key: string
  segment_name: string
  description: string
  count: number
  updated_at: string | null
}

export async function getSegmentDescriptions(
  kysely: Kysely<Database>
): Promise<SegmentDescription[]> {
  try {
    const segments = await kysely
      .selectFrom("newsletter_segment_counts")
      .selectAll()
      .execute()
    
    return segments
  } catch (error) {
    console.error('Failed to fetch segment descriptions:', error)
    return []
  }
}