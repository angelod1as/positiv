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
  email: "test@example.com",
  cpf: "123.456.789-00",
  event_title: "Test Event",
  event_emoji: "\u{1F389}",
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
      data: { eventTitle: "Test Event", eventEmoji: "\u{1F389}" },
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
      data: { eventTitle: "Test Event", eventEmoji: "\u{1F389}" },
    })
  })

  it("returns already_paid when a confirmed transaction exists", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect(validParticipantRow) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([
          { status: "confirmed" },
        ]) as never
      )

    const result = await validatePaymentToken("confirmed-token")

    expect(result).toEqual({
      status: "already_paid",
      data: { eventTitle: "Test Event", eventEmoji: "\u{1F389}" },
    })
  })

  it("returns ready with participant data when token is valid", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect(validParticipantRow) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([]) as never
      )

    const result = await validatePaymentToken("valid-token")

    expect(result).toEqual({
      status: "ready",
      data: {
        eventTitle: "Test Event",
        eventEmoji: "\u{1F389}",
        participantName: "Test User",
        participantId: "part-1",
        profileId: "prof-1",
        eventId: "evt-1",
        cpf: "123.456.789-00",
        email: "test@example.com",
        fullName: "Test User",
        socialName: null,
      },
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
        createMockTransactionsSelect([]) as never
      )

    const result = await validatePaymentToken("social-token")

    expect(result.status).toBe("ready")
    if (result.status === "ready") {
      expect(result.data.participantName).toBe("Display Name")
      expect(result.data.socialName).toBe("Display Name")
    }
  })

  it("returns ready even when there are pending transactions (no longer blocks)", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect(validParticipantRow) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([
          { status: "pending" },
        ]) as never
      )

    const result = await validatePaymentToken("pending-token")

    expect(result.status).toBe("ready")
  })

  it("returns ready when all transactions are failed (no longer returns no_valid_charges)", async () => {
    vi.mocked(kyselyDb.selectFrom)
      .mockReturnValueOnce(
        createMockParticipantSelect(validParticipantRow) as never
      )
      .mockReturnValueOnce(
        createMockTransactionsSelect([
          { status: "failed" },
          { status: "cancelled" },
        ]) as never
      )

    const result = await validatePaymentToken("failed-token")

    expect(result.status).toBe("ready")
  })
})
