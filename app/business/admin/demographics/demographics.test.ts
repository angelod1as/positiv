import { describe, expect, it } from "vitest"
import { calculateDemographics } from "./demographics"

describe("calculateDemographics", () => {
  describe("race_color demographics", () => {
    it("should deduplicate other values using Set (including Not Provided)", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1991-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1992-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1993-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: ["Branca"],
        },
        {
          date_of_birth: "1994-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: ["Custom Race"],
        },
      ]

      const result = calculateDemographics(testData)

      // Should have correct percentage for "other" category (3 null + 1 custom = 4 out of 5 = 80%)
      expect(result.race_color.other.percentage).toBe(80)

      // The values array should be deduplicated - "Not Provided" should appear only once
      const notProvidedCount = result.race_color.other.values?.filter(
        (v) => v === "Not Provided",
      ).length
      expect(notProvidedCount).toBe(1)

      // Should still contain custom race values in the values array
      expect(result.race_color.other.values).toContain("Custom Race")

      // Values should be unique (Set behavior)
      expect(result.race_color.other.values).toHaveLength(2) // "Not Provided" + "Custom Race"
    })

    it("should deduplicate repeated custom values", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: ["Custom Race"],
        },
        {
          date_of_birth: "1991-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: ["Custom Race"],
        },
        {
          date_of_birth: "1992-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: ["Another Custom"],
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.race_color.other.percentage).toBe(100)
      // Should have only 2 unique values, not 3
      expect(result.race_color.other.values).toHaveLength(2)
      expect(result.race_color.other.values).toContain("Custom Race")
      expect(result.race_color.other.values).toContain("Another Custom")
    })

    it("should handle all null race_color values with single Not Provided entry", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1991-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.race_color.other.percentage).toBe(100)
      // When all values are "Not Provided", should have only one entry
      expect(result.race_color.other.values).toHaveLength(1)
      expect(result.race_color.other.values?.[0]).toBe("Not Provided")
    })

    it("should handle standard race_color values without other category", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: ["Branca"],
        },
        {
          date_of_birth: "1991-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: ["Preta"],
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.race_color.white).toBe(50)
      expect(result.race_color.black).toBe(50)
      expect(result.race_color.other.percentage).toBe(0)
      expect(result.race_color.other.values).toHaveLength(0)
    })
  })
})
