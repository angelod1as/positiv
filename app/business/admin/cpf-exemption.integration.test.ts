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
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { setProfileCpfExempt } from "./cpf-exemption.server"

describe("setProfileCpfExempt", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let counter = 0

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const makeProfile = (cpf: string | null = "529.982.247-25") => {
    counter += 1
    return createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-${counter}-cpf-exempt@example.com`,
      full_name: "Anna Müller",
      cpf,
    })
  }

  const profileRow = (id: string) =>
    kysely
      .selectFrom("profiles")
      .select(["cpf", "cpf_exempt"])
      .where("id", "=", id)
      .executeTakeFirstOrThrow()

  const withCharge = async (
    profileId: string,
    status: "pending" | "awaiting_payment" | "paid",
    kind: "online" | "manual" = status === "paid" ? "manual" : "online",
  ) => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Exemption Event",
      ticket_price: 22000,
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profileId,
      spot_type: "regular",
      application_status: "talking",
    })
    await createTestPayment(tracker, kysely, {
      event_participant_id: participant.id,
      kind,
      status,
      amount: status === "paid" ? 22000 : null,
      method: kind === "manual" || status === "paid" ? "pix" : null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
  }

  it("exempts the profile and clears the CPF it held", async () => {
    const profile = await makeProfile()

    const result = await setProfileCpfExempt({
      profileId: profile.id,
      cpfExempt: "true",
    })

    expect(result.success).toBe(true)
    expect(await profileRow(profile.id)).toEqual({ cpf: null, cpf_exempt: true })
  })

  it("lifts the exemption, leaving the CPF for the person to give", async () => {
    const profile = await makeProfile(null)
    await setProfileCpfExempt({ profileId: profile.id, cpfExempt: "true" })

    const result = await setProfileCpfExempt({
      profileId: profile.id,
      cpfExempt: "false",
    })

    expect(result.success).toBe(true)
    expect(await profileRow(profile.id)).toEqual({ cpf: null, cpf_exempt: false })
  })

  it("refuses while an online charge is open, and changes nothing", async () => {
    for (const status of ["pending", "awaiting_payment"] as const) {
      const profile = await makeProfile(null)
      await withCharge(profile.id, status)

      const result = await setProfileCpfExempt({
        profileId: profile.id,
        cpfExempt: "true",
      })

      expect(result.success).toBe(false)
      if (result.success) continue
      expect(result.errors[0]?.message).toBe(
        adminParticipantsCopy.cpfExemption.openCharge,
      )
      expect((await profileRow(profile.id)).cpf_exempt).toBe(false)
    }
  })

  it("is not held up by a manual payment still pending", async () => {
    const profile = await makeProfile(null)
    await withCharge(profile.id, "pending", "manual")

    const result = await setProfileCpfExempt({
      profileId: profile.id,
      cpfExempt: "true",
    })

    expect(result.success).toBe(true)
  })

  it("exempts someone whose past charges are settled", async () => {
    const profile = await makeProfile(null)
    await withCharge(profile.id, "paid")

    const result = await setProfileCpfExempt({
      profileId: profile.id,
      cpfExempt: "true",
    })

    expect(result.success).toBe(true)
  })

  it("answers a profile that is not there", async () => {
    const result = await setProfileCpfExempt({
      profileId: "00000000-0000-4000-8000-000000000000",
      cpfExempt: "true",
    })

    expect(result.success).toBe(false)
  })
})
