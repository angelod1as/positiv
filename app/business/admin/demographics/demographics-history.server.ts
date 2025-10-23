import { composable } from "composable-functions"
import type { Transaction } from "kysely"
import { kysely } from "~/kysely"
import type { Database } from "~/types/database/kysely.types"
import type { Demographics } from "./demographics"

export const storeEventDemographicsSnapshot = composable(
  async ({
    eventId,
    demographics,
  }: {
    eventId: string
    demographics: Demographics
  }) => {
    try {
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
          orientation_other_percentage:
            demographics.orientation.other.percentage,
          orientation_other_values: demographics.orientation.other.values || [],
          race_color_white: demographics.race_color.white,
          race_color_yellow: demographics.race_color.yellow,
          race_color_indigenous: demographics.race_color.indigenous,
          race_color_black: demographics.race_color.black,
          race_color_brown: demographics.race_color.brown,
          race_color_other_percentage: demographics.race_color.other.percentage,
          race_color_other_values: demographics.race_color.other.values || [],
          age_average: demographics.age.average,
          age_min: demographics.age.min,
          age_max: demographics.age.max,
        })
        .returning(["id", "event_id", "calculated_at"])
        .executeTakeFirstOrThrow()

      return snapshot
    } catch (error) {
      throw new Error(
        `Failed to store demographics snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  },
)

export const upsertEventDemographicsSnapshot = composable(
  async ({
    eventId,
    demographics,
    trx,
  }: {
    eventId: string
    demographics: Demographics
    trx?: Transaction<Database>
  }) => {
    try {
      // Use transaction if provided, otherwise use kysely directly
      const db = trx || kysely

      // Use atomic UPSERT operation with onConflict to handle race conditions
      const snapshot = await db
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
          orientation_other_percentage:
            demographics.orientation.other.percentage,
          orientation_other_values: demographics.orientation.other.values || [],
          race_color_white: demographics.race_color.white,
          race_color_yellow: demographics.race_color.yellow,
          race_color_indigenous: demographics.race_color.indigenous,
          race_color_black: demographics.race_color.black,
          race_color_brown: demographics.race_color.brown,
          race_color_other_percentage: demographics.race_color.other.percentage,
          race_color_other_values: demographics.race_color.other.values || [],
          age_average: demographics.age.average,
          age_min: demographics.age.min,
          age_max: demographics.age.max,
        })
        .onConflict((oc) =>
          oc.column("event_id").doUpdateSet({
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
            orientation_other_percentage:
              demographics.orientation.other.percentage,
            orientation_other_values:
              demographics.orientation.other.values || [],
            race_color_white: demographics.race_color.white,
            race_color_yellow: demographics.race_color.yellow,
            race_color_indigenous: demographics.race_color.indigenous,
            race_color_black: demographics.race_color.black,
            race_color_brown: demographics.race_color.brown,
            race_color_other_percentage:
              demographics.race_color.other.percentage,
            race_color_other_values: demographics.race_color.other.values || [],
            age_average: demographics.age.average,
            age_min: demographics.age.min,
            age_max: demographics.age.max,
            calculated_at: new Date().toISOString(),
          }),
        )
        .returning(["id", "event_id", "calculated_at"])
        .executeTakeFirstOrThrow()

      return snapshot
    } catch (error) {
      throw new Error(
        `Failed to upsert demographics snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  },
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
      race_color: {
        white: Number(snapshot.race_color_white),
        yellow: Number(snapshot.race_color_yellow),
        indigenous: Number(snapshot.race_color_indigenous),
        black: Number(snapshot.race_color_black),
        brown: Number(snapshot.race_color_brown),
        other: {
          percentage: Number(snapshot.race_color_other_percentage),
          values: snapshot.race_color_other_values || [],
        },
      },
      age: {
        average: snapshot.age_average ? Number(snapshot.age_average) : null,
        min: snapshot.age_min,
        max: snapshot.age_max,
      },
    }

    return demographics
  },
)
