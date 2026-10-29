import { afterEach, describe, expect, it, vi } from "vitest"
import { buildCsv, downloadCSV } from "./download-csv"

const BOM = "\uFEFF"

describe("buildCsv", () => {
  it("should start with a BOM so Excel reads the file as UTF-8", () => {
    const csv = buildCsv([{ Nome: "João" }])

    expect(csv.startsWith(BOM)).toBe(true)
  })

  it("should write a header row and one line per row, separated by semicolons", () => {
    const csv = buildCsv([
      { Nome: "João", Staff: "Staff" },
      { Nome: "Maria", Staff: "" },
    ])

    expect(csv).toBe(`${BOM}Nome;Staff\r\nJoão;Staff\r\nMaria;\r\n`)
  })

  it("should keep accents as they are", () => {
    const csv = buildCsv([{ "Nome social": "Ângela Ção" }])

    expect(csv).toContain("Ângela Ção")
  })

  it("should quote fields that contain a separator, a quote or a line break", () => {
    const csv = buildCsv([
      { A: "um;dois", B: 'diz "oi"', C: "linha\num", D: "linha\rdois" },
    ])

    expect(csv).toBe(
      `${BOM}A;B;C;D\r\n"um;dois";"diz ""oi""";"linha\num";"linha\rdois"\r\n`,
    )
  })

  it("should quote a header that needs it", () => {
    const csv = buildCsv([{ "Nome; social": "João" }])

    expect(csv).toBe(`${BOM}"Nome; social"\r\nJoão\r\n`)
  })

  it("should write null and undefined as empty fields", () => {
    const csv = buildCsv([{ A: null, B: undefined, C: "x" }])

    expect(csv).toBe(`${BOM}A;B;C\r\n;;x\r\n`)
  })

  it("should return only the BOM for an empty list", () => {
    expect(buildCsv([])).toBe(BOM)
  })
})

describe("downloadCSV", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should download the content as a UTF-8 .csv file", () => {
    const createObjectURL = vi.fn((_blob: Blob) => "blob:csv")
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("planilha.csv")
      })

    const content = buildCsv([{ Nome: "João" }])
    downloadCSV(content)

    expect(click).toHaveBeenCalledOnce()
    const [blob] = createObjectURL.mock.calls[0]
    expect(blob.type).toBe("text/csv;charset=utf-8")
    expect(blob.size).toBe(new TextEncoder().encode(content).length)
    vi.unstubAllGlobals()
  })
})
