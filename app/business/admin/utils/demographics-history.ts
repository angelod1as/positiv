import { composable } from "composable-functions"
import type { Demographics } from "./demographics"

export const storeEventDemographicsSnapshot = composable(
  async ({
    eventId,
    demographics,
  }: {
    eventId: string
    demographics: Demographics
  }) => {
    return {
      id: "mock-id",
      event_id: eventId,
      calculated_at: new Date().toISOString(),
    }
  }
)

export const getEventDemographicsHistory = composable(
  async ({ eventId }: { eventId: string }) => {
    const mockDemographics: Demographics = {
      total: 0,
      veteran: { yes: 0, no: 0 },
      gender: {
        cis: 0,
        trans: 0,
        agender: 0,
        other: { percentage: 0, values: [] },
      },
      orientation: {
        straight: 0,
        homo: 0,
        biPan: 0,
        aceDemi: 0,
        other: { percentage: 0, values: [] },
      },
      age: { average: null, min: null, max: null },
    }
    
    return mockDemographics
  }
)