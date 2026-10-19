import { afterEach, describe, expect, it, vi } from "vitest"
import { logger } from "~/lib/logger/logger.server"
import { renderWithFallback } from "./render-with-fallback"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const fallback = { word: "código" }

afterEach(() => vi.clearAllMocks())

describe("renderWithFallback", () => {
  it("renders with the copy it is given", () => {
    const render = (copy: { word: string }) => `Oi ${copy.word}`

    expect(renderWithFallback("test", render, { word: "Sanity" }, fallback)).toBe(
      "Oi Sanity",
    )
  })

  it("re-renders with the fallback, and logs, when the given copy fails", () => {
    const render = (copy: { word: string }) => {
      if (copy !== fallback) throw new Error("bad copy")
      return `Oi ${copy.word}`
    }

    expect(renderWithFallback("test", render, { word: "x" }, fallback)).toBe(
      "Oi código",
    )
    expect(logger.error).toHaveBeenCalledWith(
      "The test email copy failed to render, using the default",
      { error: "bad copy" },
    )
  })

  it("propagates the error when the fallback is already in use", () => {
    const render = () => {
      throw new Error("real failure")
    }

    expect(() => renderWithFallback("test", render, fallback, fallback)).toThrow(
      "real failure",
    )
  })

  it("propagates the original error when the fallback fails too", () => {
    const render = (copy: { word: string }) => {
      throw new Error(copy === fallback ? "fallback failure" : "first failure")
    }

    expect(() =>
      renderWithFallback("test", render, { word: "x" }, fallback),
    ).toThrow("first failure")
    expect(logger.error).not.toHaveBeenCalled()
  })
})
