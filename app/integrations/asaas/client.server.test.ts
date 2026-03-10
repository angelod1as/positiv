import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/env.server", () => ({
  env: vi.fn(),
}))

import { env } from "~/env.server"
import { getAsaasConfig } from "./client.server"

const mockEnv = vi.mocked(env)

describe("getAsaasConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns sandbox baseUrl when environment is sandbox", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    const config = getAsaasConfig()

    expect(config.baseUrl).toBe("https://api-sandbox.asaas.com/v3")
  })

  it("returns production baseUrl when environment is production", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "production",
    } as ReturnType<typeof env>)

    const config = getAsaasConfig()

    expect(config.baseUrl).toBe("https://api.asaas.com/v3")
  })

  it("includes access_token header with API key", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "my-secret-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    const config = getAsaasConfig()

    expect(config.headers).toHaveProperty("access_token", "my-secret-key")
  })

  it("includes Content-Type application/json header", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    const config = getAsaasConfig()

    expect(config.headers).toHaveProperty("Content-Type", "application/json")
  })

  it("throws when ASAAS_API_KEY is not configured", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: undefined,
      asaasEnvironment: "sandbox",
    } as unknown as ReturnType<typeof env>)

    expect(() => getAsaasConfig()).toThrow("Asaas API key not configured")
  })
})
