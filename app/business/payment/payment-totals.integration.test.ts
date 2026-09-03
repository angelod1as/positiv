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
import {
  getPaymentsForEvent,
  getPaymentsForParticipant,
} from "./payment-totals.server"

describe("getPaymentsForParticipant", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Totals Event",
      ticket_price: 20000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-totals@example.com`,
      full_name: "Totals Tester",
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

  it("returns the totals and an empty list when nothing was paid", async () => {
    const result = await getPaymentsForParticipant(participantId)

    expect(result.payments).toEqual([])
    expect(result.totals).toMatchObject({
      paid_gross: 0,
      net: 0,
      fee: 0,
      payment_status: null,
    })
    expect(result.active).toBeNull()
  })

  it("lists payments newest first and names the open one", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 11000,
      base_amount: 11000,
      created_at: new Date(Date.now() - 60_000).toISOString(),
    })
    const active = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await getPaymentsForParticipant(participantId)

    expect(result.payments).toHaveLength(2)
    expect(result.payments[0].id).toBe(active.id)
    expect(result.active?.id).toBe(active.id)
    expect(result.totals.paid_gross).toBe(11000)
  })
})

describe("getPaymentsForEvent", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let eventId: string
  let paidParticipantId: string
  let emptyParticipantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Event Totals Event",
      ticket_price: 20000,
    })
    eventId = event.id
    const paidProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-event-totals-a@example.com`,
      full_name: "Event Totals Tester A",
    })
    const emptyProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-event-totals-b@example.com`,
      full_name: "Event Totals Tester B",
    })
    paidParticipantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: eventId,
        profile_id: paidProfile.id,
      })
    ).id
    emptyParticipantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: eventId,
        profile_id: emptyProfile.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("groups an event's payments by participant", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: paidParticipantId,
      amount: 12000,
      base_amount: 12000,
    })

    const byParticipant = await getPaymentsForEvent(eventId)

    expect(byParticipant[paidParticipantId]).toHaveLength(1)
    expect(byParticipant[paidParticipantId][0].id).toBe(payment.id)
    expect(byParticipant[emptyParticipantId]).toBeUndefined()
  })

  it("leaves another event's payments out", async () => {
    const testId = Date.now()
    const otherEvent = await createTestEvent(tracker, kysely, {
      title: "Other Totals Event",
      ticket_price: 20000,
    })
    const otherProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-event-totals-c@example.com`,
      full_name: "Event Totals Tester C",
    })
    const otherParticipant = await createTestEventParticipant(tracker, kysely, {
      event_id: otherEvent.id,
      profile_id: otherProfile.id,
    })
    await createTestPayment(tracker, kysely, {
      event_participant_id: otherParticipant.id,
      amount: 9000,
      base_amount: 9000,
    })

    const byParticipant = await getPaymentsForEvent(eventId)

    expect(byParticipant[otherParticipant.id]).toBeUndefined()
  })
})
