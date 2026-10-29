import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LoaderFunctionArgs } from "react-router"
import { EMAIL_CONFIRMED_PARAM } from "~/lib/hooks/use-track-email-confirmed"
import { loader } from "./confirm"

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }))

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { verifyOtp } }),
  parseCookieHeader: () => [],
  serializeCookieHeader: () => "",
}))

vi.mock("varlock/env", () => ({
  ENV: {
    VITE_SUPABASE_URL: "http://localhost:54321",
    VITE_SUPABASE_ANON_KEY: "anon",
  },
}))

async function landingFor(query: string) {
  const request = new Request(`http://localhost/auth/confirm?${query}`)
  const response = (await loader({
    request,
  } as LoaderFunctionArgs)) as Response

  return new URL(response.headers.get("Location") ?? "", "http://localhost")
}

describe("auth confirm loader", () => {
  beforeEach(() => {
    verifyOtp.mockReset()
    verifyOtp.mockResolvedValue({ error: null })
  })

  it("flags the landing page of a confirmed signup", async () => {
    const landing = await landingFor("token_hash=abc&type=email")

    expect(landing.pathname).toBe("/")
    expect(landing.searchParams.get(EMAIL_CONFIRMED_PARAM)).toBe("1")
  })

  it("keeps the query the next page already carries", async () => {
    const landing = await landingFor(
      `token_hash=abc&type=email&next=${encodeURIComponent("/conta?a=b")}`,
    )

    expect(landing.pathname).toBe("/conta")
    expect(landing.searchParams.get("a")).toBe("b")
    expect(landing.searchParams.get(EMAIL_CONFIRMED_PARAM)).toBe("1")
  })

  it("does not flag a password reset", async () => {
    const landing = await landingFor(
      "token_hash=abc&type=recovery&next=/conta/mudar-senha",
    )

    expect(landing.pathname).toBe("/conta/mudar-senha")
    expect(landing.searchParams.has(EMAIL_CONFIRMED_PARAM)).toBe(false)
  })
})
