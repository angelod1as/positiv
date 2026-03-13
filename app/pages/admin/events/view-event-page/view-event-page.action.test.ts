import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("composable-functions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("composable-functions")>()
  return {
    ...actual,
    inputFromForm: vi.fn(),
  }
})

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
}))

vi.mock("remix-forms", () => ({
  formAction: vi.fn(),
}))

vi.mock("remix-toast", () => ({
  redirectWithError: vi.fn(),
}))

vi.mock("~/lib/features.server", () => ({
  isPaymentSystemEnabled: vi.fn(),
}))

vi.mock("~/business/admin/generate-payment-link.server", () => ({
  generatePaymentLink: vi.fn(),
}))

describe("view-event-page action: generate-payment-link intent", () => {
  let mockInputFromForm: ReturnType<typeof vi.fn>
  let mockGetAdminContext: ReturnType<typeof vi.fn>
  let mockIsPaymentSystemEnabled: ReturnType<typeof vi.fn>
  let mockGeneratePaymentLink: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { inputFromForm } = await import("composable-functions")
    const { getAdminContext } = await import(
      "~/business/admin/admin.server"
    )
    const { isPaymentSystemEnabled } = await import(
      "~/lib/features.server"
    )
    const { generatePaymentLink } = await import(
      "~/business/admin/generate-payment-link.server"
    )

    mockInputFromForm = vi.mocked(inputFromForm)
    mockGetAdminContext = vi.mocked(getAdminContext)
    mockIsPaymentSystemEnabled = vi.mocked(isPaymentSystemEnabled)
    mockGeneratePaymentLink = vi.mocked(generatePaymentLink)

    mockGetAdminContext.mockResolvedValue({
      currentUser: { id: "admin-user-id" },
      supabase: {},
      supabaseHeaders: new Headers(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns error when payment system is disabled", async () => {
    mockInputFromForm.mockResolvedValue({
      intent: "generate-payment-link",
      profileId: "profile-123",
      eventId: "event-456",
    })
    mockIsPaymentSystemEnabled.mockReturnValue(false)

    const { action } = await import("./view-event-page")
    const request = new Request("http://localhost", { method: "POST" })
    const result = await action({
      request,
      params: { id: "event-456" },
    } as never)

    expect(result).toEqual({
      success: false,
      errors: [{ message: "Payment system is not enabled" }],
      intent: "generate-payment-link",
    })
    expect(mockGeneratePaymentLink).not.toHaveBeenCalled()
  })

  it("calls generatePaymentLink and returns result on success", async () => {
    mockInputFromForm.mockResolvedValue({
      intent: "generate-payment-link",
      profileId: "profile-123",
      eventId: "event-456",
    })
    mockIsPaymentSystemEnabled.mockReturnValue(true)

    const linkResult = {
      token: "token-abc",
      pixInvoiceUrl: "https://pix.url",
      creditInvoiceUrl: "https://credit.url",
      whatsappMessage: "Hello!",
    }
    mockGeneratePaymentLink.mockResolvedValue(linkResult)

    const { action } = await import("./view-event-page")
    const request = new Request("http://localhost", { method: "POST" })
    const result = await action({
      request,
      params: { id: "event-456" },
    } as never)

    expect(mockGeneratePaymentLink).toHaveBeenCalledWith({
      profileId: "profile-123",
      eventId: "event-456",
      adminProfileId: "admin-user-id",
    })
    expect(result).toEqual({
      success: true,
      intent: "generate-payment-link",
      ...linkResult,
    })
  })

  it("returns error when generatePaymentLink throws", async () => {
    mockInputFromForm.mockResolvedValue({
      intent: "generate-payment-link",
      profileId: "profile-123",
      eventId: "event-456",
    })
    mockIsPaymentSystemEnabled.mockReturnValue(true)
    mockGeneratePaymentLink.mockRejectedValue(
      new Error("Participant not found"),
    )

    const { action } = await import("./view-event-page")
    const request = new Request("http://localhost", { method: "POST" })
    const result = await action({
      request,
      params: { id: "event-456" },
    } as never)

    expect(result).toEqual({
      success: false,
      errors: [{ message: "Participant not found" }],
      intent: "generate-payment-link",
    })
  })

  it("returns validation error when profileId is missing", async () => {
    mockInputFromForm.mockResolvedValue({
      intent: "generate-payment-link",
      eventId: "event-456",
    })
    mockIsPaymentSystemEnabled.mockReturnValue(true)

    const { action } = await import("./view-event-page")
    const request = new Request("http://localhost", { method: "POST" })
    const result = await action({
      request,
      params: { id: "event-456" },
    } as never)

    expect(result).toMatchObject({
      success: false,
      intent: "generate-payment-link",
    })
    expect((result as { errors: { message: string }[] }).errors.length).toBeGreaterThan(0)
    expect(mockGeneratePaymentLink).not.toHaveBeenCalled()
  })

  it("returns validation error when eventId is missing", async () => {
    mockInputFromForm.mockResolvedValue({
      intent: "generate-payment-link",
      profileId: "profile-123",
    })
    mockIsPaymentSystemEnabled.mockReturnValue(true)

    const { action } = await import("./view-event-page")
    const request = new Request("http://localhost", { method: "POST" })
    const result = await action({
      request,
      params: { id: "event-456" },
    } as never)

    expect(result).toMatchObject({
      success: false,
      intent: "generate-payment-link",
    })
    expect((result as { errors: { message: string }[] }).errors.length).toBeGreaterThan(0)
    expect(mockGeneratePaymentLink).not.toHaveBeenCalled()
  })
})
