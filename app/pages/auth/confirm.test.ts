import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LoaderFunctionArgs } from "react-router"
import { EMAIL_CONFIRMED_PARAM } from "~/lib/hooks/use-track-email-confirmed"
import paths from "~/lib/paths"
import { loader } from "./confirm"

const { verifyOtp, clientCookies } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  clientCookies: {
    current: null as null | {
      setAll: (
        cookies: { name: string; value: string; options: object }[],
      ) => void
    },
  },
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: NonNullable<typeof clientCookies.current> },
  ) => {
    clientCookies.current = options.cookies
    return { auth: { verifyOtp } }
  },
  parseCookieHeader: () => [],
  serializeCookieHeader: (name: string, value: string) => `${name}=${value}`,
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

  it("flags the landing page of a signup confirmed by its older type", async () => {
    const landing = await landingFor("token_hash=abc&type=signup")

    expect(landing.searchParams.get(EMAIL_CONFIRMED_PARAM)).toBe("1")
  })

  it("keeps the fragment the next page carries", async () => {
    const landing = await landingFor(
      `token_hash=abc&type=email&next=${encodeURIComponent("/conta#dados")}`,
    )

    expect(landing.hash).toBe("#dados")
    expect(landing.searchParams.get(EMAIL_CONFIRMED_PARAM)).toBe("1")
  })

  it("keeps a protocol-relative next on this site", async () => {
    const landing = await landingFor(
      `token_hash=abc&type=email&next=${encodeURIComponent("//evil.com/x")}`,
    )

    expect(landing.host).toBe("localhost")
    expect(landing.pathname).toBe("/x")
  })

  it("does not flag a password reset", async () => {
    const landing = await landingFor(
      "token_hash=abc&type=recovery&next=/conta/mudar-senha",
    )

    expect(landing.pathname).toBe("/conta/mudar-senha")
    expect(landing.searchParams.has(EMAIL_CONFIRMED_PARAM)).toBe(false)
  })

  it("hands the session Supabase sets back to the browser", async () => {
    verifyOtp.mockImplementation(async () => {
      clientCookies.current?.setAll([
        { name: "sb-session", value: "signed-in", options: {} },
      ])
      return { error: null }
    })

    const response = (await loader({
      request: new Request("http://localhost/auth/confirm?token_hash=abc&type=email"),
    } as LoaderFunctionArgs)) as Response

    expect(response.headers.get("Set-Cookie")).toContain("sb-session=signed-in")
  })
})

describe("auth confirm loader when the link does not sign anyone in", () => {
  beforeEach(() => {
    verifyOtp.mockReset()
  })

  async function refusal(query: string) {
    const request = new Request(`http://localhost/auth/confirm?${query}`)
    const thrown = await loader({ request } as LoaderFunctionArgs).then(
      () => {
        throw new Error("the loader let the link through")
      },
      (error: unknown) => error as Response,
    )

    return {
      landing: new URL(thrown.headers.get("Location") ?? "", "http://localhost"),
      cookies: thrown.headers.get("Set-Cookie") ?? "",
    }
  }

  it("sends a link with no token back to the login page", async () => {
    const { landing, cookies } = await refusal("type=email")

    expect(landing.pathname).toBe(paths.auth.LOGIN)
    expect(cookies).not.toContain("sb-")
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it("sends an expired link back to the login page", async () => {
    verifyOtp.mockResolvedValue({
      error: { message: "Token has expired or is invalid", code: "otp_expired" },
    })

    const { landing, cookies } = await refusal("token_hash=abc&type=email")

    expect(landing.pathname).toBe(paths.auth.LOGIN)
    expect(cookies).not.toContain("sb-")
  })

  it("sends a link Supabase refuses for any other reason back to the login page", async () => {
    verifyOtp.mockResolvedValue({
      error: { message: "Something else went wrong", code: "unexpected" },
    })

    const { landing, cookies } = await refusal("token_hash=abc&type=email")

    expect(landing.pathname).toBe(paths.auth.LOGIN)
    expect(cookies).not.toContain("sb-")
  })
})
