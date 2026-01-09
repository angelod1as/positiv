import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { PronounsRenderer } from "./pronouns-renderer"

function createMockParams(
  pronouns: string[] | null | undefined,
): ICellRendererParams {
  return {
    value: pronouns,
    valueFormatted: String(pronouns?.join(", ") ?? ""),
    data: { pronouns },
    node: {} as ICellRendererParams["node"],
    colDef: { field: "pronouns" },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => pronouns,
    setValue: () => {},
    formatValue: () => String(pronouns?.join(", ") ?? ""),
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

describe("PronounsRenderer", () => {
  describe("when pronouns array is present", () => {
    it("joins multiple pronouns with comma and space", () => {
      const params = createMockParams(["ela/dela", "elu/delu"])

      render(<PronounsRenderer {...params} />)

      expect(screen.getByText("ela/dela, elu/delu")).toBeInTheDocument()
    })

    it("renders single pronoun without comma", () => {
      const params = createMockParams(["ele/dele"])

      render(<PronounsRenderer {...params} />)

      expect(screen.getByText("ele/dele")).toBeInTheDocument()
    })

    it("handles three or more pronouns", () => {
      const params = createMockParams(["ela/dela", "ele/dele", "elu/delu"])

      render(<PronounsRenderer {...params} />)

      expect(
        screen.getByText("ela/dela, ele/dele, elu/delu"),
      ).toBeInTheDocument()
    })
  })

  describe("when pronouns is null, undefined, or empty", () => {
    it("returns dash when pronouns is null", () => {
      const params = createMockParams(null)

      render(<PronounsRenderer {...params} />)

      expect(screen.getByText("-")).toBeInTheDocument()
    })

    it("returns dash when pronouns is undefined", () => {
      const params = createMockParams(undefined)

      render(<PronounsRenderer {...params} />)

      expect(screen.getByText("-")).toBeInTheDocument()
    })

    it("returns dash when pronouns is empty array", () => {
      const params = createMockParams([])

      render(<PronounsRenderer {...params} />)

      expect(screen.getByText("-")).toBeInTheDocument()
    })
  })
})
