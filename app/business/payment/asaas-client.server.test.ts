import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import {
  AsaasError,
  asaasRequest,
  createAsaasCustomer,
  findAsaasCustomerByCpf,
} from "./asaas-client.server"

const env = vi.hoisted<Record<string, unknown>>(() => ({
  APP_ENV: "test",
  ASAAS_API_URL: "https://api-sandbox.asaas.com/v3/",
  ASAAS_API_KEY: "aact_test_key",
}))

vi.mock("varlock/env", () => ({ ENV: env }))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function initOf(call: number): RequestInit & { headers: Record<string, string> } {
  return fetchMock.mock.calls[call][1]
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  env.ASAAS_API_URL = "https://api-sandbox.asaas.com/v3/"
  env.ASAAS_API_KEY = "aact_test_key"
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("asaasRequest", () => {
  it("sends the api key, a user agent and json, and strips the trailing slash", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "cus_1" }))

    const result = await asaasRequest(
      "POST",
      "/customers",
      zod.object({ id: zod.string() }),
      { name: "Ana" },
    )

    expect(result).toEqual({ id: "cus_1" })
    expect(fetchMock.mock.calls[0][0]).toBe("https://api-sandbox.asaas.com/v3/customers")
    const init = initOf(0)
    expect(init.method).toBe("POST")
    expect(init.headers["access_token"]).toBe("aact_test_key")
    expect(init.headers["User-Agent"]).toBe("Positiv/1.0 (test)")
    expect(init.headers["Content-Type"]).toBe("application/json")
    expect(init.body).toBe(JSON.stringify({ name: "Ana" }))
  })

  it("sends GET requests with no body and no content type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }))

    await asaasRequest(
      "GET",
      "/customers?cpfCnpj=1",
      zod.object({ data: zod.array(zod.unknown()) }),
    )

    const init = initOf(0)
    expect(init.body).toBeUndefined()
    expect(init.headers["Content-Type"]).toBeUndefined()
  })

  it("throws AsaasError carrying the api's errors on a non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ errors: [{ code: "invalid_cpfCnpj", description: "CPF inválido" }] }, 400),
    )

    const failure = asaasRequest("POST", "/customers", zod.object({ id: zod.string() }), {})

    await expect(failure).rejects.toBeInstanceOf(AsaasError)
    await expect(failure).rejects.toMatchObject({
      name: "AsaasError",
      status: 400,
      errors: [{ code: "invalid_cpfCnpj", description: "CPF inválido" }],
    })
  })

  it("throws AsaasError with an empty errors list when the body is not the envelope", async () => {
    fetchMock.mockResolvedValueOnce(new Response("gateway timeout", { status: 504 }))

    await expect(
      asaasRequest("GET", "/payments/pay_1", zod.object({ id: zod.string() })),
    ).rejects.toMatchObject({ name: "AsaasError", status: 504, errors: [] })
  })

  it("rejects a 2xx body that does not match the schema", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ nope: true }))

    await expect(
      asaasRequest("GET", "/payments/pay_1", zod.object({ id: zod.string() })),
    ).rejects.not.toBeInstanceOf(AsaasError)
  })

  it("aborts the request once the timeout elapses", async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          )
        }),
    )

    const pending = asaasRequest(
      "GET",
      "/payments/pay_1",
      zod.object({ id: zod.string() }),
      undefined,
      { timeoutMs: 1000 },
    )
    const assertion = expect(pending).rejects.toMatchObject({ name: "AbortError" })
    await vi.advanceTimersByTimeAsync(1001)
    await assertion
    vi.useRealTimers()
  })

  it("throws before reaching the network when the api key is missing", async () => {
    env.ASAAS_API_KEY = undefined

    await expect(
      asaasRequest("GET", "/payments/pay_1", zod.object({ id: zod.string() })),
    ).rejects.toThrow(/ASAAS_API_KEY/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("throws before reaching the network when the api url is missing", async () => {
    env.ASAAS_API_URL = undefined

    await expect(
      asaasRequest("GET", "/payments/pay_1", zod.object({ id: zod.string() })),
    ).rejects.toThrow(/ASAAS_API_URL/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("customers", () => {
  it("creates a customer with notifications off and the profile id as external reference", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "cus_9" }))

    const id = await createAsaasCustomer({
      name: "Ana Souza",
      cpf: "529.982.247-25",
      email: "ana@example.com",
      mobilePhone: "11999998888",
      externalReference: "profile-uuid",
    })

    expect(id).toBe("cus_9")
    expect(fetchMock.mock.calls[0][0]).toBe("https://api-sandbox.asaas.com/v3/customers")
    expect(JSON.parse(String(initOf(0).body))).toEqual({
      name: "Ana Souza",
      cpfCnpj: "52998224725",
      email: "ana@example.com",
      mobilePhone: "11999998888",
      externalReference: "profile-uuid",
      notificationDisabled: true,
    })
  })

  it("omits the phone when there is none", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "cus_9" }))

    await createAsaasCustomer({
      name: "Ana Souza",
      cpf: "52998224725",
      email: "ana@example.com",
      externalReference: "profile-uuid",
    })

    expect(JSON.parse(String(initOf(0).body))).not.toHaveProperty("mobilePhone")
  })

  it("finds an existing customer by cpf", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ id: "cus_old", deleted: false }] }))

    const id = await findAsaasCustomerByCpf("529.982.247-25")

    expect(id).toBe("cus_old")
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api-sandbox.asaas.com/v3/customers?cpfCnpj=52998224725&limit=1",
    )
    expect(initOf(0).method).toBe("GET")
  })

  it("returns null when no customer matches", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }))

    expect(await findAsaasCustomerByCpf("52998224725")).toBeNull()
  })

  it("ignores a customer Asaas has deleted", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ id: "cus_gone", deleted: true }] }))

    expect(await findAsaasCustomerByCpf("52998224725")).toBeNull()
  })
})
