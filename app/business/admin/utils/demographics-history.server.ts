import { composable } from "composable-functions"
import { kysely } from "~/kysely"
import type { Demographics } from "./demographics"

export const storeEventDemographicsSnapshot = composable(
  async ({
    eventId,
    demographics,
  }: {
    eventId: string
    demographics: Demographics
  }) => {
    const snapshot = await kysely
      .insertInto("event_demographics_history")
      .values({
        event_id: eventId,
        total: demographics.total,
        veteran_yes: demographics.veteran.yes,
        veteran_no: demographics.veteran.no,
        gender_cis: demographics.gender.cis,
        gender_trans: demographics.gender.trans,
        gender_agender: demographics.gender.agender,
        gender_other_percentage: demographics.gender.other.percentage,
        gender_other_values: demographics.gender.other.values || [],
        orientation_straight: demographics.orientation.straight,
        orientation_homo: demographics.orientation.homo,
        orientation_bi_pan: demographics.orientation.biPan,
        orientation_ace_demi: demographics.orientation.aceDemi,
        orientation_other_percentage: demographics.orientation.other.percentage,
        orientation_other_values: demographics.orientation.other.values || [],
        age_average: demographics.age.average,
        age_min: demographics.age.min,
        age_max: demographics.age.max,
      })
      .returning(["id", "event_id", "calculated_at"])
      .executeTakeFirstOrThrow()
    
    return snapshot
  }
)

export const getEventDemographicsHistory = composable(
  async ({ eventId }: { eventId: string }) => {
    const snapshot = await kysely
      .selectFrom("event_demographics_history")
      .selectAll()
      .where("event_id", "=", eventId)
      .orderBy("calculated_at", "desc")
      .limit(1)
      .executeTakeFirst()
    
    if (!snapshot) {
      return null
    }
    
    const demographics: Demographics = {
      total: snapshot.total,
      veteran: {
        yes: Number(snapshot.veteran_yes),
        no: Number(snapshot.veteran_no),
      },
      gender: {
        cis: Number(snapshot.gender_cis),
        trans: Number(snapshot.gender_trans),
        agender: Number(snapshot.gender_agender),
        other: {
          percentage: Number(snapshot.gender_other_percentage),
          values: snapshot.gender_other_values || [],
        },
      },
      orientation: {
        straight: Number(snapshot.orientation_straight),
        homo: Number(snapshot.orientation_homo),
        biPan: Number(snapshot.orientation_bi_pan),
        aceDemi: Number(snapshot.orientation_ace_demi),
        other: {
          percentage: Number(snapshot.orientation_other_percentage),
          values: snapshot.orientation_other_values || [],
        },
      },
      age: {
        average: snapshot.age_average ? Number(snapshot.age_average) : null,
        min: snapshot.age_min,
        max: snapshot.age_max,
      },
    }
    
    return demographics
  }
)