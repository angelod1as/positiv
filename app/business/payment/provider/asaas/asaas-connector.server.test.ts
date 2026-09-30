import { beforeEach, describe, expect, it, vi } from "vitest"
import { paymentsCopy } from "~/copy/payments"
import {
  AsaasError,
  createAsaasCustomer,
  createAsaasPayment,
  deleteAsaasPayment,
  findAsaasCustomerByCpf,
  getAsaasInstallmentRefunds,
  getAsaasPaymentRefunds,
} from "./asaas-client.server"
import { asaasConnector } from "./asaas-connector.server"
import { asaasRefunds } from "./asaas-refunds"

const env = vi.hoisted<Record<string, unknown>>(() => ({}))

vi.mock("varlock/env", () => ({ ENV: env }))

vi.mock("./asaas-client.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./asaas-client.server")>()),
  createAsaasCustomer: vi.fn(),
  createAsaasPayment: vi.fn(),
  deleteAsaasPayment: vi.fn(),
  findAsaasCustomerByCpf: vi.fn(),
  getAsaasInstallmentRefunds: vi.fn(),
  getAsaasPaymentRefunds: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  env.ASAAS_API_URL = "https://api-sandbox.asaas.com/v3"
  env.ASAAS_API_KEY = "aact_test_key"
  env.ASAAS_WEBHOOK_TOKEN = "whsec"
})

describe("asaasConnector", () => {
  it("is named Asaas", () => {
    expect(asaasConnector.name).toBe("Asaas")
  })

  describe("isConfigured", () => {
    it("is configured when the url, the key and the webhook token are all set", () => {
      expect(asaasConnector.isConfigured()).toBe(true)
    })

    it.each(["ASAAS_API_URL", "ASAAS_API_KEY", "ASAAS_WEBHOOK_TOKEN"])(
      "is not configured without %s",
      (name) => {
        env[name] = undefined
        expect(asaasConnector.isConfigured()).toBe(false)
      },
    )
  })

  describe("findOrCreateCustomer", () => {
    const person = {
      profileId: "profile-uuid",
      name: "Ana Souza",
      cpf: "52998224725",
      email: "ana@example.com",
      phone: "11999998888",
    }

    it("reuses the customer Asaas already holds for the CPF", async () => {
      vi.mocked(findAsaasCustomerByCpf).mockResolvedValue("cus_existing")

      expect(await asaasConnector.findOrCreateCustomer(person)).toBe(
        "cus_existing",
      )
      expect(findAsaasCustomerByCpf).toHaveBeenCalledWith("52998224725")
      expect(createAsaasCustomer).not.toHaveBeenCalled()
    })

    it("creates one, referenced by the profile, when none exists", async () => {
      vi.mocked(findAsaasCustomerByCpf).mockResolvedValue(null)
      vi.mocked(createAsaasCustomer).mockResolvedValue("cus_new")

      expect(await asaasConnector.findOrCreateCustomer(person)).toBe("cus_new")
      expect(createAsaasCustomer).toHaveBeenCalledWith({
        name: "Ana Souza",
        cpf: "52998224725",
        email: "ana@example.com",
        mobilePhone: "11999998888",
        externalReference: "profile-uuid",
      })
    })
  })

  describe("createCharge", () => {
    it("opens the charge and answers in our terms", async () => {
      vi.mocked(createAsaasPayment).mockResolvedValue({
        id: "pay_1",
        status: "PENDING",
        invoiceUrl: "https://asaas/i/pay_1",
        invoiceNumber: "000123",
        installmentId: "ins_1",
      })
      const dueDate = new Date("2026-10-01T12:00:00Z")

      const charge = await asaasConnector.createCharge({
        customerId: "cus_1",
        method: "credit_card",
        amount: 30000,
        installmentCount: 3,
        dueDate,
        description: "Positiv",
        reference: "payment-uuid",
        successUrl: null,
      })

      expect(charge).toEqual({
        chargeId: "pay_1",
        planId: "ins_1",
        checkoutUrl: "https://asaas/i/pay_1",
        dashboardRef: "000123",
      })
      expect(createAsaasPayment).toHaveBeenCalledWith({
        customerId: "cus_1",
        method: "credit_card",
        amount: 30000,
        installmentCount: 3,
        dueDate,
        description: "Positiv",
        externalReference: "payment-uuid",
        successUrl: null,
      })
    })
  })

  describe("cancelCharge", () => {
    it("deletes the charge and says whether Asaas agreed", async () => {
      vi.mocked(deleteAsaasPayment).mockResolvedValue(false)

      expect(await asaasConnector.cancelCharge("pay_1")).toBe(false)
      expect(deleteAsaasPayment).toHaveBeenCalledWith("pay_1")
    })
  })

  describe("chargeDashboardUrl", () => {
    it("links to the charge in the sandbox dashboard from the sandbox api", () => {
      expect(asaasConnector.chargeDashboardUrl("000123")).toBe(
        "https://sandbox.asaas.com/payment/show/000123",
      )
    })

    it("links to the charge in the production dashboard from the production api", () => {
      env.ASAAS_API_URL = "https://api.asaas.com/v3"
      expect(asaasConnector.chargeDashboardUrl("000123")).toBe(
        "https://www.asaas.com/payment/show/000123",
      )
    })

    it("falls back to the payments list for a charge with no number", () => {
      expect(asaasConnector.chargeDashboardUrl(null)).toBe(
        "https://sandbox.asaas.com/payment/list",
      )
    })
  })

  describe("errorMessage", () => {
    it("turns an Asaas refusal into a sentence a person can read", () => {
      const error = new AsaasError(
        400,
        [
          {
            code: "invalid_cpfCnpj",
            description: "O CPF/CNPJ informado é inválido.",
          },
        ],
        "/customers",
      )

      expect(asaasConnector.errorMessage(error, "checkout")).toBe(
        paymentsCopy.providerErrors.checkoutCpf,
      )
    })

    it("names Asaas when it refuses to be read", () => {
      const error = new AsaasError(
        404,
        [{ code: "invalid_action", description: "Cobrança não encontrada." }],
        "/payments/pay_1",
      )

      expect(asaasConnector.errorMessage(error, "sync")).toBe(
        "O Asaas não deixou atualizar este pagamento: Cobrança não encontrada.",
      )
    })
  })

  describe("fetchRefunds", () => {
    it("reads a single charge's refunds from the charge", async () => {
      vi.mocked(getAsaasPaymentRefunds).mockResolvedValue([
        { value: 117.15, status: "DONE" },
      ])

      expect(
        await asaasConnector.fetchRefunds({ chargeId: "pay_1", planId: null }),
      ).toEqual([{ amount: 11715, state: "done" }])
      expect(getAsaasPaymentRefunds).toHaveBeenCalledWith("pay_1")
      expect(getAsaasInstallmentRefunds).not.toHaveBeenCalled()
    })

    it("reads a card plan's refunds from the plan, not its charge", async () => {
      vi.mocked(getAsaasInstallmentRefunds).mockResolvedValue([
        { value: 50, status: "PENDING" },
      ])

      expect(
        await asaasConnector.fetchRefunds({
          chargeId: "pay_1",
          planId: "ins_1",
        }),
      ).toEqual([{ amount: 5000, state: "pending" }])
      expect(getAsaasInstallmentRefunds).toHaveBeenCalledWith("ins_1")
      expect(getAsaasPaymentRefunds).not.toHaveBeenCalled()
    })
  })
})

describe("asaasRefunds", () => {
  it("counts only DONE as given back, as the Asaas docs say", () => {
    expect(
      asaasRefunds([
        { value: 117.15, status: "DONE" },
        { value: 108.51, status: "PENDING" },
      ]),
    ).toEqual([
      { amount: 11715, state: "done" },
      { amount: 10851, state: "pending" },
    ])
  })

  it("counts a refund waiting for an authorisation as still on its way", () => {
    expect(
      asaasRefunds([
        { value: 50, status: "AWAITING_CRITICAL_ACTION_AUTHORIZATION" },
        { value: 10, status: "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION" },
      ]),
    ).toEqual([
      { amount: 5000, state: "pending" },
      { amount: 1000, state: "pending" },
    ])
  })

  it("keeps a cancelled refund apart", () => {
    expect(asaasRefunds([{ value: 10, status: "CANCELLED" }])).toEqual([
      { amount: 1000, state: "cancelled" },
    ])
  })

  it("does not count a refund of unknown status as money back", () => {
    expect(asaasRefunds([{ value: 20 }])).toEqual([
      { amount: 2000, state: "pending" },
    ])
  })
})
