import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("~/lib/features.server", () => ({
  isPaymentSystemEnabled: vi.fn(),
}))

vi.mock("~/kysely-db", () => ({
  kyselyDb: {
    selectFrom: vi.fn(),
  },
}))

import { isPaymentSystemEnabled } from "~/lib/features.server"
import { kyselyDb } from "~/kysely-db"
import { validatePaymentToken } from "./validate-payment-token.server"

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

const validParticipantRow = {
  participant_id: "part-1",
  profile_id: "prof-1",
  event_id: "evt-1",
  has_paid: false,
  full_name: "Test User",
  social_name: null as string | null,
  event_title: "Test Event",
  event_emoji: "🎉",
  payment_link_expires_at: futureDate,
}

function createMockParticipantSelect(result: unknown) {
  return {
    innerJoin: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }),
  }
}

function createMockTransactionsSelect(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

const pendingPixTransaction = {
  payment_method: "pix",
  amount: 22_000,
  status: "pending",
  installments: null as number | null,
  asaas_payment_data: { invoiceUrl: "https://asaas.com/i/pix-123" },
}

const pendingCreditTransaction = {
  payment_method: "credit_card",
  amount: 22_700,
  status: "pending",
  installments: 6,
  asaas_payment_data: { invoiceUrl: "https://asaas.com/i/cc-456" },
}

describe("validatePaymentToken", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(true)
  })

  it("returns not_found when feature flag is off", async () => {
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(false)

    const result = await validatePaymentToken("some-token")

    expect(result).toEqual({ status: "not_found" })
  })

  it("returns not_found when no participant matches token", async () => {
    vi.mocked(kyselyDb.selectFrom).mockReturnValue(
      createMockParticipantSelect(undefined) as never
    )

    const result = await validatePaymentToken("invalid-token")

    expect(result).toEqual({ status: "not_found" })
  })

  it("returns expired when payment_link_expires_at is in the past", async () => {
    vi.mocked(kyselyDb.selectFrom).mockReturnValue(
      createMockParticipantSelect({
        ...validParticipantRow,
        payment_link_expires_at: pastDate,
      }) as never
    )

    const result = await validatePaymentToken("expired-token")

    expect(result).toEqual({
      status: "expired",
      data: { eventTitle: "Test Event", eventEmoji: "🎉" },
    })
  })

  it("returns already_paid when has_paid is true", async () => {
    vi.mocked(kyselyDb.selectFrom).mockReturnValue(
      createMockParticipantSelect({
        ...validParticipantRow,
        has_paid: true,
      }) as never
    )

    const result = await validatePaymentToken("paid-token")

    expect(result).toEqual({
      status: "already_paid",
      data: { eventTitle: "Test Event", eventEmoji: "🎉" },
    })
  })

  it("returns already_paid when a confirmed transaction exists", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect(validParticipantRow) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([
          { ...pendingPixTransaction, status: "confirmed" },
        ]) as never
      )

    const result = await validatePaymentToken("confirmed-token")

    expect(result).toEqual({
      status: "already_paid",
      data: { eventTitle: "Test Event", eventEmoji: "🎉" },
    })
  })

  it("returns success with 2 payment options", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect(validParticipantRow) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([
          pendingPixTransaction,
          pendingCreditTransaction,
        ]) as never
      )

    const result = await validatePaymentToken("valid-token")

    expect(result).toEqual({
      status: "success",
      data: {
        eventTitle: "Test Event",
        eventEmoji: "🎉",
        participantName: "Test User",
        paymentOptions: [
          {
            method: "pix",
            amount: 22_000,
            invoiceUrl: "https://asaas.com/i/pix-123",
          },
          {
            method: "credit_card",
            amount: 22_700,
            invoiceUrl: "https://asaas.com/i/cc-456",
            installments: 6,
          },
        ],
      },
    })
  })

  it("returns success with 1 payment option when one failed", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect(validParticipantRow) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([
          pendingPixTransaction,
          { ...pendingCreditTransaction, status: "failed" },
        ]) as never
      )

    const result = await validatePaymentToken("partial-token")

    expect(result.status).toBe("success")
    if (result.status === "success") {
      expect(result.data.paymentOptions).toHaveLength(1)
      expect(result.data.paymentOptions[0].method).toBe("pix")
    }
  })

  it("returns no_valid_charges when all transactions failed", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect(validParticipantRow) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([
          { ...pendingPixTransaction, status: "failed" },
          { ...pendingCreditTransaction, status: "cancelled" },
        ]) as never
      )

    const result = await validatePaymentToken("failed-token")

    expect(result).toEqual({
      status: "no_valid_charges",
      data: { eventTitle: "Test Event", eventEmoji: "🎉" },
    })
  })

  it("uses social_name for participantName when available", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect({
          ...validParticipantRow,
          social_name: "Display Name",
        }) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([pendingPixTransaction]) as never
      )

    const result = await validatePaymentToken("social-token")

    if (result.status === "success") {
      expect(result.data.participantName).toBe("Display Name")
    }
  })
})
