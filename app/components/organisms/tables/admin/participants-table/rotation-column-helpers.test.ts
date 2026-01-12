import { describe, expect, it } from "vitest"
import { shouldAutoCheckWasSelectedForRotation } from "./rotation-column-helpers"

describe("shouldAutoCheckWasSelectedForRotation", () => {
  describe("auto-check when attendance_status is 'skipped' and was_selected_for_rotation is false", () => {
    it("returns true when attendance_status is 'skipped' and was_selected_for_rotation is false", () => {
      const result = shouldAutoCheckWasSelectedForRotation("skipped", false)
      expect(result).toBe(true)
    })
  })

  describe("no auto-check when attendance_status is not 'skipped'", () => {
    it("returns false when attendance_status is 'pending'", () => {
      const result = shouldAutoCheckWasSelectedForRotation("pending", false)
      expect(result).toBe(false)
    })

    it("returns false when attendance_status is 'attended'", () => {
      const result = shouldAutoCheckWasSelectedForRotation("attended", false)
      expect(result).toBe(false)
    })

    it("returns false when attendance_status is 'not-attended'", () => {
      const result = shouldAutoCheckWasSelectedForRotation("not-attended", false)
      expect(result).toBe(false)
    })

    it("returns false when attendance_status is 'will-not-go'", () => {
      const result = shouldAutoCheckWasSelectedForRotation("will-not-go", false)
      expect(result).toBe(false)
    })
  })

  describe("no auto-check when was_selected_for_rotation is already true", () => {
    it("returns false when attendance_status is 'skipped' but was_selected_for_rotation is already true", () => {
      const result = shouldAutoCheckWasSelectedForRotation("skipped", true)
      expect(result).toBe(false)
    })

    it("returns false when attendance_status is 'pending' and was_selected_for_rotation is true", () => {
      const result = shouldAutoCheckWasSelectedForRotation("pending", true)
      expect(result).toBe(false)
    })

    it("returns false when attendance_status is 'attended' and was_selected_for_rotation is true", () => {
      const result = shouldAutoCheckWasSelectedForRotation("attended", true)
      expect(result).toBe(false)
    })
  })

  describe("never auto-uncheck (was_selected_for_rotation stays true once set)", () => {
    it("does not indicate to uncheck when changing from 'skipped' to 'attended'", () => {
      const result = shouldAutoCheckWasSelectedForRotation("attended", true)
      expect(result).toBe(false)
    })

    it("does not indicate to uncheck when changing from 'skipped' to 'pending'", () => {
      const result = shouldAutoCheckWasSelectedForRotation("pending", true)
      expect(result).toBe(false)
    })
  })
})
