import { describe, expect, it, vi } from "vitest"

import { paragraphs } from "../../test/portable-text"
import { sections } from "../../test/sections"
import { run } from "./run"
import { HomepageDocument, homepageToPage } from "./transform"

const homepage: HomepageDocument = {
  _id: "homepage",
  _type: "homepage",
  hero: { _type: "hero", title: "Título", subtitle: paragraphs("Subtítulo") },
  ...sections,
}

function fakeStore(found: HomepageDocument | null = homepage) {
  return {
    fetchHomepage: vi.fn(async () => found),
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
      page: homepageToPage(homepage),
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
    expect(store.createOrReplace).toHaveBeenCalledWith(
      homepageToPage(homepage),
    )
  })

  it("refuses a dataset without a published homepage", async () => {
    const store = fakeStore(null)

    await expect(
      run(["--dataset", "development", "--no-dry-run"], () => store),
    ).rejects.toThrow(/homepage/)
    expect(store.createOrReplace).not.toHaveBeenCalled()
  })
})
