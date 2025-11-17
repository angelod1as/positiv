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

  describe("age demographics", () => {
    it("should filter out ages <= 0 from calculations", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1985-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "2030-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.age.min).toBeGreaterThan(0)
      expect(result.age.min).not.toBe(0)
    })

    it("should filter out ages > 120 from calculations", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1985-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1800-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.age.max).toBeLessThanOrEqual(120)
      expect(result.age.max).not.toBeGreaterThan(120)
    })

    it("should only include valid ages (1-120) in min/max/avg calculations", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1980-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "2030-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
        {
          date_of_birth: "1800-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Hetero"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.age.min).toBeGreaterThan(0)
      expect(result.age.max).toBeLessThanOrEqual(120)
      expect(result.age.average).toBeGreaterThan(0)
      expect(result.age.average).toBeLessThanOrEqual(120)
    })
  })

  describe("orientation demographics with priority-based assignment", () => {
    it("should count each person in only ONE orientation category", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Bi", "Hétero"],
          race_color: null,
        },
        {
          date_of_birth: "1991-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Pan"],
          race_color: null,
        },
        {
          date_of_birth: "1992-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Gay"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      const totalPercentage =
        result.orientation.straight +
        result.orientation.homo +
        result.orientation.biPan +
        result.orientation.aceDemi +
        (result.orientation.other?.percentage || 0)

      expect(totalPercentage).toBe(100)
    })

    it("should prioritize Bi/Pan over Hétero when person has both", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hétero", "Bi"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.orientation.biPan).toBe(100)
      expect(result.orientation.straight).toBe(0)
    })

    it("should prioritize Bi/Pan over Ace/Demi when person has both", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Bi", "Demi"],
          race_color: null,
        },
        {
          date_of_birth: "1991-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Pan", "Ace"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.orientation.biPan).toBe(100)
      expect(result.orientation.aceDemi).toBe(0)
    })

    it("should prioritize Bi/Pan over Homo (Lésbica) when person has both", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Lésbica", "Bi"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.orientation.biPan).toBe(100)
      expect(result.orientation.homo).toBe(0)
    })

    it("should handle complex multi-orientation scenarios with correct priority", () => {
      const testData = [
        {
          date_of_birth: "1990-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Hétero"],
          race_color: null,
        },
        {
          date_of_birth: "1991-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Bi", "Demi", "Hétero"],
          race_color: null,
        },
        {
          date_of_birth: "1992-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Gay"],
          race_color: null,
        },
        {
          date_of_birth: "1993-01-01",
          gender: ["Mulher cis"],
          is_veteran: false,
          orientation: ["Ace"],
          race_color: null,
        },
        {
          date_of_birth: "1994-01-01",
          gender: ["Homem cis"],
          is_veteran: false,
          orientation: ["Pan", "Lésbica"],
          race_color: null,
        },
      ]

      const result = calculateDemographics(testData)

      expect(result.orientation.straight).toBe(20)
      expect(result.orientation.biPan).toBe(40)
      expect(result.orientation.homo).toBe(20)
      expect(result.orientation.aceDemi).toBe(20)

      const totalPercentage =
        result.orientation.straight +
        result.orientation.homo +
        result.orientation.biPan +
        result.orientation.aceDemi +
        (result.orientation.other?.percentage || 0)

      expect(totalPercentage).toBe(100)
    })
  })
})
