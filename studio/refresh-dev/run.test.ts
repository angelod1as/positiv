import { describe, expect, it, vi } from "vitest"

import { run } from "./run"

function fakeStore(
  sourceIds: string[] = [],
  targetIds: string[] = [],
) {
  return {
    sourceIds: vi.fn(async () => sourceIds),
    targetIds: vi.fn(async () => targetIds),
    exportSource: vi.fn(async () => undefined),
    deleteFromTarget: vi.fn(async () => undefined),
    importToTarget: vi.fn(async () => undefined),
  }
}

describe("run", () => {
  it.each([
    ["production", ["--target", "production"]],
    ["staging", ["--target", "staging"]],
    ["an empty target", ["--target", ""]],
  ])(
    "refuses to write anywhere but development (%s), before connecting",
    async (_, args) => {
      const connect = vi.fn(() => fakeStore())

      await expect(run(args, connect)).rejects.toThrow(/development/)
      expect(connect).not.toHaveBeenCalled()
    },
  )

  it("hard-codes production as the source and development as the target", async () => {
    const connect = vi.fn(() => fakeStore())

    await run([], connect)

    expect(connect).toHaveBeenCalledWith("production", "development")
  })

  it("dry-runs by default: reports what it would do and writes nothing", async () => {
    const store = fakeStore(["a", "b"], ["a", "seed-leftover"])

    const result = await run([], () => store)

    expect(result).toEqual({
      dryRun: true,
      source: "production",
      target: "development",
      before: 2,
      deleted: ["seed-leftover"],
      imported: 2,
      after: 2,
    })
    expect(store.exportSource).not.toHaveBeenCalled()
    expect(store.deleteFromTarget).not.toHaveBeenCalled()
    expect(store.importToTarget).not.toHaveBeenCalled()
  })

  it("mirrors with --no-dry-run: imports production, then deletes the leftovers", async () => {
    const store = fakeStore(["a", "b"], ["a", "seed-leftover"])

    const result = await run(["--no-dry-run"], () => store)

    expect(result).toMatchObject({
      dryRun: false,
      before: 2,
      deleted: ["seed-leftover"],
      imported: 2,
      after: 2,
    })
    expect(store.deleteFromTarget).toHaveBeenCalledWith(["seed-leftover"])
    expect(store.importToTarget).toHaveBeenCalledTimes(1)
  })

  it("exports first, imports next, and deletes the leftovers last", async () => {
    const store = fakeStore(["a"], ["a", "seed-leftover"])

    await run(["--no-dry-run"], () => store)

    expect(store.exportSource.mock.invocationCallOrder[0]).toBeLessThan(
      store.importToTarget.mock.invocationCallOrder[0],
    )
    expect(store.importToTarget.mock.invocationCallOrder[0]).toBeLessThan(
      store.deleteFromTarget.mock.invocationCallOrder[0],
    )
  })

  it("leaves the leftovers in place when the import fails", async () => {
    const store = fakeStore(["a"], ["a", "seed-leftover"])
    store.importToTarget = vi.fn(async () => {
      throw new Error("import failed")
    })

    await expect(run(["--no-dry-run"], () => store)).rejects.toThrow(
      /import failed/,
    )
    expect(store.deleteFromTarget).not.toHaveBeenCalled()
  })

  it("surfaces a failed delete, which runs after the import so a re-run recovers", async () => {
    const store = fakeStore(["a"], ["a", "seed-leftover"])
    store.deleteFromTarget = vi.fn(async () => {
      throw new Error("delete failed")
    })

    await expect(run(["--no-dry-run"], () => store)).rejects.toThrow(
      /delete failed/,
    )
    expect(store.importToTarget).toHaveBeenCalledTimes(1)
  })

  it("is idempotent: a second run with nothing to delete deletes nothing", async () => {
    const store = fakeStore(["a", "b"], ["a", "b"])

    const result = await run(["--no-dry-run"], () => store)

    expect(result.deleted).toEqual([])
    expect(result.after).toBe(result.before)
    expect(store.deleteFromTarget).not.toHaveBeenCalled()
    expect(store.exportSource).toHaveBeenCalledTimes(1)
    expect(store.importToTarget).toHaveBeenCalledTimes(1)
  })
})
