import { describe, expect, it, vi } from "vitest"

import { run } from "./run"
import { emailTemplatesDocument } from "./transform"

function fakeStore() {
  return { createIfNotExists: vi.fn(async () => undefined) }
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

  it("dry-runs by default: returns the document and writes nothing", async () => {
    const store = fakeStore()

    const result = await run(["--dataset", "development"], () => store)

    expect(result).toEqual({ dryRun: true, document: emailTemplatesDocument() })
    expect(store.createIfNotExists).not.toHaveBeenCalled()
  })

  it("writes the singleton, and only it, with --no-dry-run", async () => {
    const store = fakeStore()

    const result = await run(
      ["--dataset", "development", "--no-dry-run"],
      () => store,
    )

    expect(result.dryRun).toBe(false)
    expect(store.createIfNotExists).toHaveBeenCalledTimes(1)
    expect(store.createIfNotExists).toHaveBeenCalledWith(emailTemplatesDocument())
  })
})
