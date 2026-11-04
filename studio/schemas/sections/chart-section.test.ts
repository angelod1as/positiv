import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { sections } from "../../test/sections"
import { validateValueOf } from "../../test/validate"
import { chartSection as chartSectionType } from "./chart-section"

const { chartSection } = sections
const [firstRow, secondRow] = chartSection.rows

const row = (key: string, values: number[], highlight = false) => ({
  _type: "chartRow",
  _key: key,
  label: key,
  values,
  highlight,
})

describe("chartSection", () => {
  it.each(["bar", "horizontalBar", "line", "proportion"])(
    "accepts a %s chart",
    async (chartType) => {
      expect(
        await validateValueOf("chartSection", { ...chartSection, chartType }),
      ).toEqual([])
    },
  )

  it.each(["none", "percent", "brl"])(
    "accepts the %s unit",
    async (unit) => {
      expect(
        await validateValueOf("chartSection", { ...chartSection, unit }),
      ).toEqual([])
    },
  )

  it("accepts several series when every row has a value for each", async () => {
    expect(
      await validateValueOf("chartSection", {
        ...chartSection,
        series: ["Novates", "Veteranes"],
        rows: [row("a", [1, 2]), row("b", [3, 4])],
      }),
    ).toEqual([])
  })

  it.each(["title", "summary", "chartType", "unit"])(
    "requires the %s",
    async (field) => {
      const errors = await validateValueOf("chartSection", {
        ...chartSection,
        [field]: undefined,
      })

      expect(pathsOf(errors)).toContain(`chartSection.${field}`)
    },
  )

  it("rejects a chart type outside the four", async () => {
    const errors = await validateValueOf("chartSection", {
      ...chartSection,
      chartType: "pie",
    })

    expect(pathsOf(errors)).toContain("chartSection.chartType")
  })

  it("requires at least one series", async () => {
    const errors = await validateValueOf("chartSection", {
      ...chartSection,
      series: [],
    })

    expect(pathsOf(errors)).toContain("chartSection.series")
  })

  it("allows at most eight series, one per chart colour", async () => {
    const series = Array.from({ length: 9 }, (_, index) => `S${index}`)
    const errors = await validateValueOf("chartSection", {
      ...chartSection,
      series,
      rows: [row("a", series.map(() => 1))],
    })

    expect(pathsOf(errors)).toContain("chartSection.series")
  })

  it("requires at least one row", async () => {
    const errors = await validateValueOf("chartSection", {
      ...chartSection,
      rows: [],
    })

    expect(pathsOf(errors)).toContain("chartSection.rows")
  })

  it.each(["label", "values"])("requires a row's %s", async (field) => {
    const errors = await validateValueOf("chartSection", {
      ...chartSection,
      rows: [{ ...firstRow, [field]: undefined }],
    })

    expect(pathsOf(errors)).toContain(
      `chartSection.rows.${firstRow._key}.${field}`,
    )
  })

  it("rejects a row with fewer values than series", async () => {
    const errors = await validateValueOf("chartSection", {
      ...chartSection,
      series: ["Novates", "Veteranes"],
      rows: [row("a", [1, 2]), row("b", [3])],
    })

    expect(pathsOf(errors)).toContain("chartSection.rows.b.values")
  })

  it("rejects a second highlighted row", async () => {
    const errors = await validateValueOf("chartSection", {
      ...chartSection,
      rows: [
        { ...firstRow, highlight: true },
        { ...secondRow, highlight: true },
      ],
    })

    expect(pathsOf(errors)).toContain("chartSection.rows")
  })

  describe("as a 100% bar", () => {
    const proportion = { ...chartSection, chartType: "proportion" }

    it("accepts six parts", async () => {
      expect(
        await validateValueOf("chartSection", {
          ...proportion,
          rows: ["a", "b", "c", "d", "e", "f"].map((key) => row(key, [1])),
        }),
      ).toEqual([])
    })

    it("rejects a seventh part", async () => {
      const errors = await validateValueOf("chartSection", {
        ...proportion,
        rows: ["a", "b", "c", "d", "e", "f", "g"].map((key) => row(key, [1])),
      })

      expect(pathsOf(errors)).toContain("chartSection.rows")
    })

    it("rejects a second series", async () => {
      const errors = await validateValueOf("chartSection", {
        ...proportion,
        series: ["Receita", "Gastos"],
        rows: [row("a", [1, 2])],
      })

      expect(pathsOf(errors)).toContain("chartSection.series")
    })

    it("rejects a negative part", async () => {
      const errors = await validateValueOf("chartSection", {
        ...proportion,
        rows: [row("a", [3]), row("b", [-1])],
      })

      expect(pathsOf(errors)).toContain("chartSection.rows.b.values")
    })
  })

  it("titles the preview Gráfico when it has no title", () => {
    expect(chartSectionType.preview?.prepare?.({ title: "" })).toEqual(
      expect.objectContaining({ title: "Gráfico" }),
    )
  })
})
