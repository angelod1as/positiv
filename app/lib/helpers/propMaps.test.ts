import { describe, expect, it } from "vitest"
import {
  applicationStatusOptions,
  isVeteranOptions,
  PARTICIPANTS_TABLE_FILTER_CONFIGS,
} from "./propMaps"

describe("propMaps", () => {
  describe("isVeteranOptions", () => {
    it("should have exactly 2 options", () => {
      expect(isVeteranOptions).toHaveLength(2)
    })

    it("should map true to Veterano", () => {
      const veteranOption = isVeteranOptions.find((opt) => opt.value === "true")
      expect(veteranOption).toBeDefined()
      expect(veteranOption?.name).toBe("Veterano")
      expect(veteranOption?.label).toBe("Veterano")
    })

    it("should map false to Novate", () => {
      const rookieOption = isVeteranOptions.find((opt) => opt.value === "false")
      expect(rookieOption).toBeDefined()
      expect(rookieOption?.name).toBe("Novate")
      expect(rookieOption?.label).toBe("Novate")
    })

    it("should have required properties (name, label, value)", () => {
      isVeteranOptions.forEach((option) => {
        expect(option).toHaveProperty("name")
        expect(option).toHaveProperty("label")
        expect(option).toHaveProperty("value")
        expect(typeof option.name).toBe("string")
        expect(typeof option.label).toBe("string")
        expect(typeof option.value).toBe("string")
      })
    })
  })

  describe("PARTICIPANTS_TABLE_FILTER_CONFIGS", () => {
    it("should have is_veteran filter configuration", () => {
      expect(PARTICIPANTS_TABLE_FILTER_CONFIGS).toHaveProperty("is_veteran")
    })

    it("should have correct is_veteran filter config properties", () => {
      const config = PARTICIPANTS_TABLE_FILTER_CONFIGS.is_veteran
      expect(config).toHaveProperty("storageKey")
      expect(config).toHaveProperty("options")
      expect(config).toHaveProperty("matchMode")
      expect(config).toHaveProperty("allValues")
    })

    it("should have correct is_veteran storageKey", () => {
      const config = PARTICIPANTS_TABLE_FILTER_CONFIGS.is_veteran
      expect(config.storageKey).toBe("admin-participants-filter-is-veteran")
    })

    it("should have correct is_veteran matchMode", () => {
      const config = PARTICIPANTS_TABLE_FILTER_CONFIGS.is_veteran
      expect(config.matchMode).toBe("custom_is_veteran")
    })

    it("should have isVeteranOptions as options", () => {
      const config = PARTICIPANTS_TABLE_FILTER_CONFIGS.is_veteran
      expect(config.options).toBe(isVeteranOptions)
    })

    it("should return all values correctly", () => {
      const config = PARTICIPANTS_TABLE_FILTER_CONFIGS.is_veteran
      const allValues = config.allValues
      expect(allValues).toEqual(["true", "false"])
    })
  })

  // Sanity test for existing filters
  describe("existing filters", () => {
    it("should have application_status filter", () => {
      expect(PARTICIPANTS_TABLE_FILTER_CONFIGS).toHaveProperty(
        "application_status",
      )
      expect(applicationStatusOptions.length).toBeGreaterThan(0)
    })
  })
})
