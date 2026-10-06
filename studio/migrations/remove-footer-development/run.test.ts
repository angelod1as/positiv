import { describe, expect, it, vi } from "vitest"

import { run } from "./run"

function fakeStore(present: string[] = []) {
  return {
    existingIds: vi.fn(async () => present),
    unset: vi.fn(async () => undefined),
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

  it("dry-runs by default: reports the documents and unsets nothing", async () => {
    const store = fakeStore(["siteSettings"])

    const result = await run(["--dataset", "development"], () => store)

    expect(result).toEqual({
      dryRun: true,
      ids: ["siteSettings"],
      unset: ["footer.development"],
    })
    expect(store.unset).not.toHaveBeenCalled()
  })

  it("unsets footer.development on the documents that exist, with --no-dry-run", async () => {
    const store = fakeStore(["siteSettings", "drafts.siteSettings"])

    const result = await run(
      ["--dataset", "development", "--no-dry-run"],
      () => store,
    )

    expect(result.dryRun).toBe(false)
    expect(store.unset).toHaveBeenCalledTimes(1)
    expect(store.unset).toHaveBeenCalledWith(
      ["siteSettings", "drafts.siteSettings"],
      ["footer.development"],
    )
  })

  it("writes nothing when no siteSettings document exists", async () => {
    const store = fakeStore([])

    const result = await run(
      ["--dataset", "development", "--no-dry-run"],
      () => store,
    )

    expect(result.ids).toEqual([])
    expect(store.unset).not.toHaveBeenCalled()
  })

  it("looks for the documents before unsetting, so it never patches a missing one", async () => {
    const store = fakeStore(["siteSettings"])

    await run(["--dataset", "development", "--no-dry-run"], () => store)

    expect(store.existingIds.mock.invocationCallOrder[0]).toBeLessThan(
      store.unset.mock.invocationCallOrder[0],
    )
  })
})
