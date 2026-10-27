import { afterEach, describe, expect, it } from "vitest"
import {
  isAdminPath,
  UMAMI_BEFORE_SEND,
  umamiBeforeSendScript,
} from "./admin-pages"

describe("isAdminPath", () => {
  it.each(["/admin", "/admin/", "/admin/eventos/123"])(
    "counts %s as an admin page",
    (pathname) => {
      expect(isAdminPath(pathname)).toBe(true)
    },
  )

  it.each(["/", "/eventos", "/administracao", "/dashboard/admin"])(
    "does not count %s as an admin page",
    (pathname) => {
      expect(isAdminPath(pathname)).toBe(false)
    },
  )
})

describe("umamiBeforeSendScript", () => {
  type BeforeSend = (type: string, payload: unknown) => unknown

  function installHook(): BeforeSend {
    new Function(umamiBeforeSendScript)()
    return (window as unknown as Record<string, BeforeSend>)[UMAMI_BEFORE_SEND]
  }

  afterEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("drops whatever Umami would send while the browser is on an admin page", () => {
    const beforeSend = installHook()
    window.history.replaceState(null, "", "/admin/eventos")

    expect(beforeSend("event", { url: "/admin/eventos" })).toBe(false)
  })

  it("lets through what Umami sends from any other page", () => {
    const beforeSend = installHook()
    const payload = { url: "/administracao" }
    window.history.replaceState(null, "", "/administracao")

    expect(beforeSend("event", payload)).toBe(payload)
  })
})
