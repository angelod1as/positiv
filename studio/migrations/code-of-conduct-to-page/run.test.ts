import { describe, expect, it, vi } from "vitest"

import { run } from "./run"
import { codeOfConductToPage } from "./transform"

function fakeStore(pageHasDraft = false) {
  return {
    pageHasDraft: vi.fn(async () => pageHasDraft),
    createOrReplace: vi.fn(async () => undefined),
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

  it("dry-runs by default: returns the Page and writes nothing", async () => {
    const store = fakeStore()

    const result = await run(["--dataset", "development"], () => store)

    expect(result).toEqual({
      dryRun: true,
      page: codeOfConductToPage(),
      pageHasDraft: false,
    })
    expect(store.createOrReplace).not.toHaveBeenCalled()
  })

  it("writes the Page, and only the Page, with --no-dry-run", async () => {
    const store = fakeStore()

    const result = await run(
      ["--dataset", "development", "--no-dry-run"],
      () => store,
    )

    expect(result.dryRun).toBe(false)
    expect(store.createOrReplace).toHaveBeenCalledTimes(1)
    expect(store.createOrReplace).toHaveBeenCalledWith(codeOfConductToPage())
  })

  it.each([true, false])(
    "reports whether the Page has a draft (%s), which would hide what it writes",
    async (pageHasDraft) => {
      const store = fakeStore(pageHasDraft)

      const result = await run(["--dataset", "development"], () => store)

      expect(result.pageHasDraft).toBe(pageHasDraft)
    },
  )

  it("looks for the draft before writing, so the warning comes first", async () => {
    const store = fakeStore(true)

    await run(["--dataset", "development", "--no-dry-run"], () => store)

    expect(store.pageHasDraft.mock.invocationCallOrder[0]).toBeLessThan(
      store.createOrReplace.mock.invocationCallOrder[0],
    )
  })
})
