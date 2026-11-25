import { describe, expect, it, vi } from "vitest"

import { applicationRules } from "./application-rules"
import { run, type Store } from "./run"

const paragraph = (text: string) => ({
  _type: "block" as const,
  _key: text,
  style: "normal" as const,
  markDefs: [],
  children: [{ _type: "span" as const, _key: "s", text, marks: [] }],
})

const draftPage = [
  {
    title: "Regras gerais",
    body: [paragraph("🚨 Nenhuma pessoa é obrigada a nada 🚨"), paragraph("Não faça.")],
  },
  {
    title: "Acordos",
    body: [paragraph("⏰ Pontualidade 🕐"), paragraph("Seja pontual.")],
  },
]

function fakeStore(sections: Awaited<ReturnType<Store["sourceSections"]>> = draftPage) {
  return {
    sourceSections: vi.fn(async () => sections),
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

  it("writes to the dataset it is given and reads the draft page from production", async () => {
    const connect = vi.fn(() => fakeStore())

    await run(["--dataset", "development"], connect)

    expect(connect).toHaveBeenCalledWith("development", "production")
  })

  it("reads the draft page from another dataset when told to", async () => {
    const connect = vi.fn(() => fakeStore())

    await run(
      ["--dataset", "development", "--source-dataset", "development"],
      connect,
    )

    expect(connect).toHaveBeenCalledWith("development", "development")
  })

  it("dry-runs by default: builds the Rules and writes nothing", async () => {
    const store = fakeStore()

    const { dryRun, document } = await run(["--dataset", "development"], () => store)

    expect(dryRun).toBe(true)
    expect(document.generalRules.map((rule) => rule.title)).toEqual([
      "🚨 Nenhuma pessoa é obrigada a nada 🚨",
    ])
    expect(document.agreements.map((rule) => rule.title)).toEqual([
      "⏰ Pontualidade 🕐",
    ])
    expect(document.privateRules.map((rule) => rule.title)).toEqual(
      applicationRules.map((section) => section.heading),
    )
    expect(store.write).not.toHaveBeenCalled()
  })

  it("writes the draft Rules with --no-dry-run", async () => {
    const store = fakeStore()

    const { document } = await run(
      ["--dataset", "development", "--no-dry-run"],
      () => store,
    )

    expect(store.write).toHaveBeenCalledWith(document)
  })

  it("refuses to write when the draft page is missing a part", async () => {
    const store = fakeStore([draftPage[0]])

    await expect(
      run(["--dataset", "development", "--no-dry-run"], () => store),
    ).rejects.toThrow(/Acordos/)
    expect(store.write).not.toHaveBeenCalled()
  })

  it("refuses to write when there is no draft page", async () => {
    const store = fakeStore(null)

    await expect(
      run(["--dataset", "development", "--no-dry-run"], () => store),
    ).rejects.toThrow(/regras-e-acordos/)
    expect(store.write).not.toHaveBeenCalled()
  })
})
