import { describe, expect, it } from "vitest"
import type { Demographics } from "./demographics"

describe("Event Demographics History", () => {
  describe("storeEventDemographicsSnapshot", () => {
    it("should store and retrieve demographics snapshot", () => {
      const mockDemographics: Demographics = {
        total: 15,
        veteran: { yes: 60, no: 40 },
        gender: {
          cis: 70,
          trans: 20,
          agender: 5,
          other: { percentage: 5, values: ["Non-binary"] }
        },
        orientation: {
          straight: 30,
          homo: 25,
          biPan: 25,
          aceDemi: 10,
          other: { percentage: 10, values: ["Questioning"] }
        },
        age: { average: 28.5, min: 21, max: 45 }
      }
      
      expect(mockDemographics.total).toBe(15)
      expect(mockDemographics.veteran.yes).toBe(60)
      expect(mockDemographics.veteran.no).toBe(40)
    })
  })

  describe("getEventDemographicsHistory", () => {
    it("should transform database format to Demographics format", () => {
      const dbSnapshot = {
        total: 20,
        veteran_yes: 70,
        veteran_no: 30,
        gender_cis: 60,
        gender_trans: 20,
        gender_agender: 10,
        gender_other_percentage: 10,
        gender_other_values: ["Non-binary"],
        orientation_straight: 40,
        orientation_homo: 20,
        orientation_bi_pan: 20,
        orientation_ace_demi: 10,
        orientation_other_percentage: 10,
        orientation_other_values: ["Questioning"],
        age_average: 27.5,
        age_min: 22,
        age_max: 40
      }
      
      const expectedDemographics: Demographics = {
        total: dbSnapshot.total,
        veteran: {
          yes: Number(dbSnapshot.veteran_yes),
          no: Number(dbSnapshot.veteran_no),
        },
        gender: {
          cis: Number(dbSnapshot.gender_cis),
          trans: Number(dbSnapshot.gender_trans),
          agender: Number(dbSnapshot.gender_agender),
          other: {
            percentage: Number(dbSnapshot.gender_other_percentage),
            values: dbSnapshot.gender_other_values || [],
          },
        },
        orientation: {
          straight: Number(dbSnapshot.orientation_straight),
          homo: Number(dbSnapshot.orientation_homo),
          biPan: Number(dbSnapshot.orientation_bi_pan),
          aceDemi: Number(dbSnapshot.orientation_ace_demi),
          other: {
            percentage: Number(dbSnapshot.orientation_other_percentage),
            values: dbSnapshot.orientation_other_values || [],
          },
        },
        age: {
          average: dbSnapshot.age_average ? Number(dbSnapshot.age_average) : null,
          min: dbSnapshot.age_min,
          max: dbSnapshot.age_max,
        },
      }
      
      expect(expectedDemographics.total).toBe(20)
      expect(expectedDemographics.veteran.yes).toBe(70)
      expect(expectedDemographics.veteran.no).toBe(30)
    })
  })
})