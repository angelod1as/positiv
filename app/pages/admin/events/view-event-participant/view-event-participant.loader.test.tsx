import { NoResultError, type QueryNode } from "kysely"
import { getToast } from "remix-toast"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getEventParticipantBasic } from "~/business/application/event-participants.server"
import { getParticipantLikert } from "~/business/profile/participant-likert.server"
import { getParticipantFullEventHistory, getProfileById } from "~/business/profile/profiles.server"
import { getPaymentsForParticipant } from "~/business/payment/payment-totals.server"
import { isOnlinePaymentsEnabled } from "~/business/payment/online-payments.server"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { PERMISSIONS } from "~/business/auth/permissions"
import { adminEventsCopy } from "~/copy/admin/events"
import { loader } from "./view-event-participant"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { ...logger, child: () => logger },
}))

vi.mock("~/business/auth/admin-context.server", () => ({
  getAdminContext: vi.fn(),
}))
vi.mock("~/business/profile/participant-likert.server", () => ({
  getParticipantLikert: vi.fn(),
}))
vi.mock("~/business/profile/profiles.server", () => ({
  getParticipantFullEventHistory: vi.fn(),
  getProfileById: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
  updateProfileApprovalStatus: vi.fn(),
}))
vi.mock("~/business/application/event-participants.server", () => ({
  getEventParticipantBasic: vi.fn(),
  updateEventParticipantById: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isCardPaymentsEnabled: vi.fn(async () => true),
}))

vi.mock("~/business/payment/online-payments.server", () => ({
  isOnlinePaymentsEnabled: vi.fn(),
}))

vi.mock("~/business/payment/payment-totals.server", () => ({
  getPaymentsForParticipant: vi.fn(async () => []),
}))

vi.mock("~/business/payment/payment-messages.server", async (importActual) => ({
  ...(await importActual<
    typeof import("~/business/payment/payment-messages.server")
  >()),
  loadWhatsappPaymentMessage: vi.fn(
    async () => "Oi {{nome}}, pague {{link}} até {{data}}.",
  ),
}))

type ProfileResult = Awaited<ReturnType<typeof getProfileById>>
type ParticipantResult = Awaited<ReturnType<typeof getEventParticipantBasic>>
type AdminContext = Awaited<ReturnType<typeof getAdminContext>>

const currentProfile = {
  id: "11111111-2222-4333-8444-555555555555",
  permissions: ["admin.panel", "profiles.manage", "payments.manage"],
}

const runLoader = (
  params: { eventId?: string; profileId?: string } = {
    eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
    profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
  },
) =>
  loader({
    request: new Request(`http://localhost/admin/eventos/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/participantes/7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f`),
    params,
  } as Parameters<typeof loader>[0])

const EVENT_PAGE = "/admin/eventos/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"

const landingOf = async (response: unknown) => {
  const redirect = response as Response
  const cookie = (redirect.headers.get("Set-Cookie") ?? "").split(";")[0]
  const toast = await getToast(
    new Request("http://localhost", { headers: { Cookie: cookie } }),
  )
  return {
    location: redirect.headers.get("Location"),
    message: toast.toast?.message,
    type: toast.toast?.type,
  }
}

describe("view event participant loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile,
    } as unknown as AdminContext)
    vi.mocked(getParticipantLikert).mockResolvedValue([])
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(false)
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: { id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
      errors: [],
    } as unknown as ProfileResult)
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: true,
      data: null,
      errors: [],
    } as unknown as ParticipantResult)
  })

  it("checks the admin before reading anything about the person", async () => {
    const denied = new Response(null, { status: 403 })
    vi.mocked(getAdminContext).mockRejectedValue(denied)

    await expect(runLoader()).rejects.toBe(denied)
    expect(getProfileById).not.toHaveBeenCalled()
    expect(getEventParticipantBasic).not.toHaveBeenCalled()
    expect(getParticipantLikert).not.toHaveBeenCalled()
  })

  it("sends the admin to the events list when the event id is missing", async () => {
    const landing = await landingOf(
      await runLoader({ profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" }),
    )

    expect(landing).toEqual({
      location: "/admin/eventos",
      message: adminEventsCopy.eventNotFound,
      type: "error",
    })
  })

  it("sends the admin back to the event when the profile id is missing", async () => {
    const landing = await landingOf(
      await runLoader({ eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" }),
    )

    expect(landing).toEqual({
      location: EVENT_PAGE,
      message: adminEventsCopy.viewParticipant.participantNotFound,
      type: "error",
    })
  })

  it("sends the admin back to the event when the profile does not exist", async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      success: false,
      errors: [new NoResultError({} as QueryNode)],
    } as ProfileResult)

    const landing = await landingOf(await runLoader())

    expect(landing).toEqual({
      location: EVENT_PAGE,
      message: adminEventsCopy.viewParticipant.profileNotFound,
      type: "error",
    })
  })

  it("sends the admin back to the event when the person has not applied to it", async () => {
    const landing = await landingOf(await runLoader())

    expect(landing).toEqual({
      location: EVENT_PAGE,
      message: adminEventsCopy.viewParticipant.notAppliedToEvent,
      type: "error",
    })
  })

  it("warns, without alerting, when the profile does not exist", async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      success: false,
      errors: [new NoResultError({} as QueryNode)],
    } as ProfileResult)

    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.warn).toHaveBeenCalledWith("Profile not found", {
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
    })
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("logs an error when the profile cannot be fetched", async () => {
    const errors = [new Error("connection lost")]
    vi.mocked(getProfileById).mockResolvedValue({
      success: false,
      errors,
    } as ProfileResult)

    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.error).toHaveBeenCalledWith("Failed to fetch profile", {
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      errors,
    })
  })

  it("warns, without alerting, when the person has not applied to the event", async () => {
    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.warn).toHaveBeenCalledWith(
      "Participant has not applied to this event",
      { profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("logs an error when the event participant cannot be fetched", async () => {
    const errors = [new Error("connection lost")]
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: false,
      errors,
    } as ParticipantResult)

    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to fetch event participant",
      { profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c", errors },
    )
  })

  it.each([true, false])(
    "hands the payment modal the online payments switch (%s)",
    async (enabled) => {
      vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(enabled)
      vi.mocked(getEventParticipantBasic).mockResolvedValue({
        success: true,
        data: { id: "participant-1" },
        errors: [],
      } as unknown as ParticipantResult)
      vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
        success: true,
        data: [],
        errors: [],
      } as unknown as Awaited<
        ReturnType<typeof getParticipantFullEventHistory>
      >)

      const result = await runLoader()

      expect(result).toMatchObject({
        paymentsEnabled: enabled,
        providerName: "Asaas",
      })
    },
  )

  it("hands the modal a message built for the active charge, named by social_name", async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: {
        id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
        social_name: "Ana Social",
        full_name: "Ana Legal",
      },
      errors: [],
    } as unknown as ProfileResult)
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: true,
      data: { id: "participant-1", event_title: "Festa" },
      errors: [],
    } as unknown as ParticipantResult)
    vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getParticipantFullEventHistory>>)
    vi.mocked(getPaymentsForParticipant).mockResolvedValue({
      active: { id: "pay-1", access_token: "tok-1", due_at: "2026-09-01T12:00:00Z", base_amount: 25000 },
      payments: [],
      totals: {},
    } as unknown as Awaited<ReturnType<typeof getPaymentsForParticipant>>)

    const { whatsappMessage } = (await runLoader()) as {
      whatsappMessage: string | null
    }

    expect(whatsappMessage).toContain("Ana Social")
    expect(whatsappMessage).toContain("/pagamento/t/tok-1")
    expect(whatsappMessage).toContain("01/09/2026")
  })

  it("hands the modal no message when there is no active charge", async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: { id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", full_name: "Ana" },
      errors: [],
    } as unknown as ProfileResult)
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: true,
      data: { id: "participant-1", event_title: "Festa" },
      errors: [],
    } as unknown as ParticipantResult)
    vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getParticipantFullEventHistory>>)
    vi.mocked(getPaymentsForParticipant).mockResolvedValue({
      active: null,
      payments: [],
      totals: {},
    } as unknown as Awaited<ReturnType<typeof getPaymentsForParticipant>>)

    const { whatsappMessage } = (await runLoader()) as {
      whatsappMessage: string | null
    }

    expect(whatsappMessage).toBeNull()
  })

  it("hands the page the person's Likert submissions", async () => {
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: true,
      data: { id: "participant-1", event_title: "Festa" },
      errors: [],
    } as unknown as ParticipantResult)
    vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getParticipantFullEventHistory>>)
    const likert = [
      {
        id: "aaaaaaaa-1111-4111-8111-111111111111",
        submittedAt: new Date("2026-11-10T12:00:00Z"),
      },
    ]
    vi.mocked(getParticipantLikert).mockResolvedValue(likert)

    const data = await runLoader()

    expect(getParticipantLikert).toHaveBeenCalledWith({
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      viewer: currentProfile,
    })
    expect(data).toMatchObject({ likert })
  })

  it("sends no payment data to a person without payments.manage", async () => {
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile: { permissions: [PERMISSIONS.ADMIN_PANEL] },
    } as unknown as Awaited<ReturnType<typeof getAdminContext>>)
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(true)
    const paid = {
      paid_gross: 22000,
      net: 21000,
      refunded: 0,
      payment_status: "paid",
      active_payment_id: "pay-1",
    }
    const blank = {
      paid_gross: 0,
      net: 0,
      refunded: 0,
      payment_status: null,
      active_payment_id: null,
    }
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: true,
      data: { id: "participant-1", event_title: "Festa", ...paid },
      errors: [],
    } as unknown as ParticipantResult)
    vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
      success: true,
      data: [{ id: "ep-old", ...paid }],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getParticipantFullEventHistory>>)

    const result = await runLoader()

    expect(getPaymentsForParticipant).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      canManagePayments: false,
      paymentsEnabled: false,
      participantPayments: undefined,
      whatsappMessage: null,
      eventParticipant: { id: "participant-1", ...blank },
      fullHistory: [{ id: "ep-old", ...blank }],
    })
  })
})
