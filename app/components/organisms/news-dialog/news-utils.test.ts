import { describe, expect, it } from "vitest"
import { DEFAULT_NEWS_ITEMS, NEWS_VERSION } from "./news-utils"

const itemFiles = import.meta.glob("./items/*.ts")

describe("news items loaded from the items folder", () => {
  it("loads one news item per file, identified by the file name", () => {
    const expectedIds = Object.keys(itemFiles)
      .map((path) => path.replace(/^\.\/items\/|\.ts$/g, ""))
      .sort()

    expect(expectedIds.length).toBeGreaterThan(0)
    expect([...DEFAULT_NEWS_ITEMS].map((item) => item.id).sort()).toEqual(
      expectedIds,
    )
  })

  it("gives every item the fields the dialog renders", () => {
    for (const item of DEFAULT_NEWS_ITEMS) {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.content.length).toBeGreaterThan(0)
      expect(item.createdAt).toBeInstanceOf(Date)
      expect(Number.isNaN(item.createdAt.getTime())).toBe(false)
      expect(item.isActive).toBe(true)
    }
  })
})

describe("NEWS_VERSION", () => {
  it("matches the publish date of the newest item", () => {
    const newest = Math.max(
      ...DEFAULT_NEWS_ITEMS.map((item) => item.createdAt.getTime()),
    )

    expect(NEWS_VERSION).toBe(newest)
  })
})
