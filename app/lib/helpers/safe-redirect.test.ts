import { describe, expect, it } from "vitest"
import { safeRedirect } from "./safe-redirect"

const FALLBACK = "/dashboard"

describe("safeRedirect", () => {
  it("keeps a same-site path", () => {
    expect(safeRedirect("/convite/abc", FALLBACK)).toBe("/convite/abc")
  })

  it("keeps a path with a query string", () => {
    expect(safeRedirect("/dashboard/1/regras?q=2", FALLBACK)).toBe(
      "/dashboard/1/regras?q=2",
    )
  })

  it.each([
    ["nothing at all", undefined],
    ["an empty string", ""],
    ["only whitespace", "   "],
    ["a protocol-relative URL", "//evil.example/phishing"],
    ["a backslash-escaped host", "/\\evil.example"],
    ["an absolute http URL", "http://evil.example"],
    ["an absolute https URL", "https://evil.example"],
    ["our own host spelled out", "https://positiv.com.br/dashboard"],
    ["a javascript URL", "javascript:alert(1)"],
    ["a data URL", "data:text/html,<script>alert(1)</script>"],
    ["a bare path with no leading slash", "dashboard"],
    ["a path with a newline in it", "/dashboard\n/evil"],
  ])("refuses %s", (_label, value) => {
    expect(safeRedirect(value, FALLBACK)).toBe(FALLBACK)
  })
})
