import { describe, expect, it, vi } from "vitest"

import {
  duplicateKeys,
  LIKERT_KEY_PATTERN,
} from "../../../app/business/cms/likert-key"
import { run, type Store } from "./run"

function fakeStore(existing: Awaited<ReturnType<Store["existingScale"]>> = null) {
  return {
    existingScale: vi.fn(async () => existing),
    write: vi.fn(async () => undefined),
  }
}

describe("run", () => {
  it.each([
    ["no arguments", []],
    ["a flag without a value", ["--dataset"]],
    ["only --no-dry-run", ["--no-dry-run"]],
  ])("refuses %s, before connecting to any dataset", async (_, args) => {
    const connect = vi.fn(() => fakeStore())

    await expect(run(args, connect)).rejects.toThrow(/--dataset/)
    expect(connect).not.toHaveBeenCalled()
  })

  it("connects to the dataset it is given", async () => {
    const connect = vi.fn(() => fakeStore())

    await run(["--dataset", "development"], connect)

    expect(connect).toHaveBeenCalledWith("development")
  })

  it("dry-runs by default: builds the draft scale and writes nothing", async () => {
    const store = fakeStore()

    const { dryRun, document } = await run(["--dataset", "development"], () => store)

    expect(dryRun).toBe(true)
    expect(document._id).toBe("drafts.likertScale")
    expect(document._type).toBe("likertScale")
    expect(store.write).not.toHaveBeenCalled()
  })

  it("carries the council document's 55 statements, in its order", async () => {
    const { document } = await run(["--dataset", "development"], () => fakeStore())

    expect(document.statements).toHaveLength(55)
    expect(document.statements[0]?.text).toBe("Sou uma pessoa não-monogâmica.")
    expect(document.statements[43]?.text).toBe(
      "Preciso beber ou fumar para me soltar num evento desses.",
    )
    expect(document.statements[54]?.text).toBe(
      "Quando uma pessoa que frequenta a Positiv testa positivo para alguma IST, tem que avisar os organizadores - mesmo que de forma anônima.",
    )
  })

  it("writes plain text, since the form shows the statement as it is", async () => {
    const { document } = await run(["--dataset", "development"], () => fakeStore())

    expect(document.statements[1]?.text).toBe("Me identifico como swinger.")
    expect(document.statements.filter(({ text }) => text.includes("*"))).toEqual([])
  })

  it("builds a scale the app accepts, each statement keyed for good", async () => {
    const { document } = await run(["--dataset", "development"], () => fakeStore())

    const keys = document.statements.map(({ key }) => key)
    expect(keys.filter((key) => !LIKERT_KEY_PATTERN.test(key))).toEqual([])
    expect(duplicateKeys(keys)).toEqual([])
    expect(document.statements.filter(({ text }) => text.trim() === "")).toEqual([])
    expect(document.statements[0]).toEqual({
      _type: "likertStatement",
      _key: "afirmacao-01",
      key: "afirmacao-01",
      text: "Sou uma pessoa não-monogâmica.",
    })
  })

  it("writes the draft scale with --no-dry-run", async () => {
    const store = fakeStore()

    const { dryRun, document } = await run(
      ["--dataset", "development", "--no-dry-run"],
      () => store,
    )

    expect(dryRun).toBe(false)
    expect(store.write).toHaveBeenCalledWith(document)
  })

  it("refuses when a scale is already published: new keys would detach its answers", async () => {
    const store = fakeStore({ _id: "likertScale" })

    await expect(
      run(["--dataset", "production", "--no-dry-run"], () => store),
    ).rejects.toThrow(/already has a Likert scale \(likertScale\)/)
    expect(store.write).not.toHaveBeenCalled()
  })

  it("refuses when a draft scale exists: replacing it would discard an Editor's work", async () => {
    const store = fakeStore({ _id: "drafts.likertScale" })

    await expect(
      run(["--dataset", "production", "--no-dry-run"], () => store),
    ).rejects.toThrow(/already has a Likert scale \(drafts\.likertScale\)/)
    expect(store.write).not.toHaveBeenCalled()
  })
})
