import { describe, expect, it, vi } from "vitest"

describe("env.server - Asaas environment variables", () => {
  it("parses Asaas env vars and returns camelCased keys", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ASAAS_API_KEY", "test-api-key")
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "test-webhook-token")
    vi.stubEnv("ASAAS_ENVIRONMENT", "sandbox")
    vi.stubEnv("APP_URL", "https://positiv.com.br")

    const { env } = await import("./env.server")
    const result = env()

    expect(result.asaasApiKey).toBe("test-api-key")
    expect(result.asaasWebhookToken).toBe("test-webhook-token")
    expect(result.asaasEnvironment).toBe("sandbox")
    expect(result.appUrl).toBe("https://positiv.com.br")

    vi.unstubAllEnvs()
  })

  it("defaults ASAAS_ENVIRONMENT to sandbox when not provided", async () => {
    vi.stubEnv("NODE_ENV", "development")

    vi.resetModules()
    const { env } = await import("./env.server")
    const result = env()

    expect(result.asaasEnvironment).toBe("sandbox")

    vi.unstubAllEnvs()
  })

  it("works without any Asaas vars (all optional)", async () => {
    vi.stubEnv("NODE_ENV", "development")

    vi.resetModules()
    const { env } = await import("./env.server")
    const result = env()

    expect(result.asaasApiKey).toBeUndefined()
    expect(result.asaasWebhookToken).toBeUndefined()
    expect(result.appUrl).toBeUndefined()

    vi.unstubAllEnvs()
  })
})
