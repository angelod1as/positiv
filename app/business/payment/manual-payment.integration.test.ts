import { formatInTimeZone } from "date-fns-tz"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"
import { registerManualPayment } from "./manual-payment.server"

describe("registerManualPayment", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let adminProfileId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Manual Payment Event",
      ticket_price: 20000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-manual@example.com`,
      full_name: "Manual Tester",
    })
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-manual-admin@example.com`,
      full_name: "Manual Admin",
    })
    adminProfileId = admin.id
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const trackPayments = async () => {
    const rows = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .execute()
    rows.forEach((row) => tracker.track("payments", row.id))
    return rows
  }

  it("records a paid row and credits the totals", async () => {
    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: "150",
      method: "pix",
      paidAt: "2026-08-20",
      note: "Combinado no WhatsApp",
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(true)

    const [row] = await trackPayments()

    expect(row).toMatchObject({
      kind: "manual",
      status: "paid",
      method: "pix",
      amount: 15000,
      base_amount: 15000,
      note: "Combinado no WhatsApp",
      created_by: adminProfileId,
    })

    // The date the admin typed is a date in São Paulo, not a UTC instant.
    // Stored as UTC midnight it reads back as the day before, every time.
    expect(
      formatInTimeZone(row.paid_at as string, "America/Sao_Paulo", "yyyy-MM-dd"),
    ).toBe("2026-08-20")

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(totals.net).toBe(15000)
    expect(totals.fee).toBe(0)
  })

  it("records a courtesy spot settled at zero", async () => {
    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: "0",
      method: "other",
      paidAt: "2026-08-20",
      note: "Cortesia",
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(true)

    const [row] = await trackPayments()
    expect(row).toMatchObject({ status: "paid", amount: 0, base_amount: 0 })

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(totals.has_paid).toBe(true)
    expect(totals.paid_gross).toBe(0)
  })

  it("refuses an amount that is not a number", async () => {
    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: "",
      method: "cash",
      paidAt: "2026-08-20",
      note: null,
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toBe("Informe um valor de zero ou mais.")
    }
    expect(await trackPayments()).toHaveLength(0)
  })

  it("refuses a negative amount", async () => {
    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: "-10",
      method: "cash",
      paidAt: "2026-08-20",
      note: null,
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(false)
    expect(await trackPayments()).toHaveLength(0)
  })

  it("refuses a date it cannot read", async () => {
    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: "150",
      method: "pix",
      paidAt: "não é uma data",
      note: null,
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(false)
    expect(await trackPayments()).toHaveLength(0)
  })

  it("answers a sentence, not a Postgres error, when the participant is gone", async () => {
    const result = await registerManualPayment({
      eventParticipantId: "00000000-0000-0000-0000-000000000000",
      amount: "150",
      method: "pix",
      paidAt: "2026-08-20",
      note: null,
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toBe(
        "Não foi possível concluir a operação.",
      )
    }
  })

  it("refuses to record one while a charge is still open", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: "150",
      method: "pix",
      paidAt: "2026-08-20",
      note: null,
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toMatch(/cobrança em aberto/i)
    }
  })

  it("serialises two payments recorded at the same moment", async () => {
    // The check and the insert run inside one transaction holding the
    // participant's row, so two admins recording at once take turns. Both
    // amounts are real payments and both belong in the ledger — what must not
    // happen is a deadlock, a lost row, or one of them slipping past the
    // open-charge check.
    const record = (amount: string) =>
      registerManualPayment({
        eventParticipantId: participantId,
        amount,
        method: "pix",
        paidAt: "2026-08-20",
        note: null,
        createdBy: adminProfileId,
      })

    const results = await Promise.all([record("100"), record("50")])

    expect(results.every((result) => result.success)).toBe(true)
    expect(await trackPayments()).toHaveLength(2)

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(totals.paid_gross).toBe(15000)
  })

  it("allows a second manual payment once the first is recorded", async () => {
    await registerManualPayment({
      eventParticipantId: participantId,
      amount: "100",
      method: "pix",
      paidAt: "2026-08-20",
      note: null,
      createdBy: adminProfileId,
    })
    const second = await registerManualPayment({
      eventParticipantId: participantId,
      amount: "50",
      method: "cash",
      paidAt: "2026-08-21",
      note: null,
      createdBy: adminProfileId,
    })

    expect(second.success).toBe(true)

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(totals.paid_gross).toBe(15000)

    await trackPayments()
  })
})
