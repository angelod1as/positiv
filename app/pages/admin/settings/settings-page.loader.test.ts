import { describe, expect, it, vi } from "vitest"
import { getContext } from "~/business/auth/auth.server"
import { defaultSettings } from "~/test/request-context"
import type { Route } from "./+types/settings-page"
import { loader } from "./settings-page"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

describe("SettingsPage loader", () => {
  it("hands the page the settings from the request context", async () => {
    const onlinePayments = {
      ...defaultSettings.onlinePayments,
      switchedOn: true,
      asaasConfigured: true,
      enabled: true,
    }
    vi.mocked(getContext).mockResolvedValue({
      settings: { onlinePayments },
    } as Awaited<ReturnType<typeof getContext>>)

    const result = await loader({
      request: new Request("http://localhost/admin/configuracoes"),
      params: {},
      context: {},
    } as unknown as Route.LoaderArgs)

    expect(result).toEqual({ onlinePayments })
  })
})
