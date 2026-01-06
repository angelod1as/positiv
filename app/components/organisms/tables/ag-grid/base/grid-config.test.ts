import { describe, expect, it } from "vitest"

import { defaultColDef, defaultGridOptions, frameworkComponents } from "./grid-config"

describe("grid-config", () => {
  describe("defaultColDef", () => {
    it("should enable sorting by default", () => {
      expect(defaultColDef.sortable).toBe(true)
    })

    it("should enable resizing by default", () => {
      expect(defaultColDef.resizable).toBe(true)
    })

    it("should enable filtering by default", () => {
      expect(defaultColDef.filter).toBe(true)
    })

    it("should set minimum column width", () => {
      expect(defaultColDef.minWidth).toBe(100)
    })
  })

  describe("defaultGridOptions", () => {
    it("should set row height to 48px", () => {
      expect(defaultGridOptions.rowHeight).toBe(48)
    })

    it("should set header height to 48px", () => {
      expect(defaultGridOptions.headerHeight).toBe(48)
    })

    it("should enable row animations", () => {
      expect(defaultGridOptions.animateRows).toBe(true)
    })

    it("should enable cell text selection", () => {
      expect(defaultGridOptions.enableCellTextSelection).toBe(true)
    })
  })

  describe("frameworkComponents", () => {
    it("should be an object for registering custom components", () => {
      expect(frameworkComponents).toBeDefined()
      expect(typeof frameworkComponents).toBe("object")
    })
  })
})
