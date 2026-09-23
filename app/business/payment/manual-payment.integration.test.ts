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
import { editManualPayment, registerManualPayment } from "./manual-payment.server"

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

  it("lets two payments recorded at the same moment both land", async () => {
    // Note what this does and does not prove: two paid rows never see each
    // other as an open charge, so it passes with the row lock removed. It
    // guards against a deadlock and a lost row, not against the race the lock
    // is there for — that one needs a charge opening mid-transaction, which
    // nothing here can schedule deterministically.
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

describe("editManualPayment", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Edit Manual Payment Event",
      ticket_price: 22000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-edit-manual@example.com`,
      full_name: "Edit Manual Tester",
    })
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

  const readPayment = (id: string) =>
    kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()

  it("corrects the amount, method, date and note of a paid manual payment", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      base_amount: 21985,
      amount: 21985,
      method: "pix",
      note: null,
    })

    const result = await editManualPayment({
      paymentId: payment.id,
      amount: "220,00",
      method: "transfer",
      paidAt: "2026-09-10",
      note: "Valor corrigido",
    })

    expect(result.success).toBe(true)

    const row = await readPayment(payment.id)
    expect(row).toMatchObject({
      kind: "manual",
      status: "paid",
      method: "transfer",
      amount: 22000,
      base_amount: 22000,
      note: "Valor corrigido",
    })
    // Same rule as recording one: the admin typed a day in São Paulo.
    expect(
      formatInTimeZone(row.paid_at as string, "America/Sao_Paulo", "yyyy-MM-dd"),
    ).toBe("2026-09-10")
    expect(row.due_at).toEqual(row.paid_at)

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(totals.paid_gross).toBe(22000)
    expect(totals.net).toBe(22000)
  })

  it("refuses to edit a payment that went through Asaas", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      amount: 21985,
      base_amount: 21985,
    })

    const result = await editManualPayment({
      paymentId: payment.id,
      amount: "220,00",
      method: "pix",
      paidAt: "2026-09-10",
      note: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toBe(
        "Só é possível editar um pagamento manual confirmado.",
      )
    }
    expect((await readPayment(payment.id)).amount).toBe(21985)
  })

  it("refuses to edit a manual payment already refunded", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      status: "refunded",
      amount: 21985,
      base_amount: 21985,
      refund_amount: 21985,
      refunded_at: new Date().toISOString(),
    })

    const result = await editManualPayment({
      paymentId: payment.id,
      amount: "220,00",
      method: "pix",
      paidAt: "2026-09-10",
      note: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toBe(
        "Só é possível editar um pagamento manual confirmado.",
      )
    }
    expect((await readPayment(payment.id)).amount).toBe(21985)
  })

  it("refuses a payment that does not exist", async () => {
    const result = await editManualPayment({
      paymentId: "00000000-0000-0000-0000-000000000000",
      amount: "220,00",
      method: "pix",
      paidAt: "2026-09-10",
      note: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toBe(
        "Só é possível editar um pagamento manual confirmado.",
      )
    }
  })

  it("refuses an amount it cannot read and leaves the row alone", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 21985,
      base_amount: 21985,
    })

    const result = await editManualPayment({
      paymentId: payment.id,
      amount: "",
      method: "pix",
      paidAt: "2026-09-10",
      note: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toBe("Informe um valor de zero ou mais.")
    }
    expect((await readPayment(payment.id)).amount).toBe(21985)
  })

  it("refuses a negative amount", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
    })

    const result = await editManualPayment({
      paymentId: payment.id,
      amount: "-10",
      method: "pix",
      paidAt: "2026-09-10",
      note: null,
    })

    expect(result.success).toBe(false)
    expect((await readPayment(payment.id)).amount).toBe(22000)
  })
})
