import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"

const uniqueEmail = () =>
  `test${Date.now()}-${Math.random().toString(36).slice(2, 8)}-admin@example.com`

const { asaas } = vi.hoisted(() => ({
  asaas: { configured: true },
}))

// This suite talks to a real Supabase, so ENV cannot be replaced with a blank
// object. Only the Asaas values are pinned; everything else falls through.
vi.mock("varlock/env", async (importOriginal) => {
  const original = await importOriginal<{ ENV: Record<string, unknown> }>()
  const asaasKeys = ["ASAAS_API_URL", "ASAAS_API_KEY", "ASAAS_WEBHOOK_TOKEN"]
  return {
    ENV: new Proxy(original.ENV, {
      get: (target, key: string) =>
        asaasKeys.includes(key)
          ? asaas.configured
            ? `test-${key}`
            : undefined
          : Reflect.get(target, key),
    }),
  }
})

import {
  getOnlinePaymentsSetting,
  isOnlinePaymentsEnabled,
  setOnlinePaymentsEnabled,
} from "./app-settings.server"

describe("online payments setting", () => {
  const { tracker, kysely } = setupIntegrationTest()

  const resetSettings = () =>
    kysely
      .insertInto("app_settings")
      .values({ id: true, online_payments_enabled: false, updated_by: null })
      .onConflict((oc) =>
        oc
          .column("id")
          .doUpdateSet({ online_payments_enabled: false, updated_by: null }),
      )
      .execute()

  beforeEach(async () => {
    asaas.configured = true
    tracker.clear()
    await resetSettings()
  })

  afterEach(async () => {
    await resetSettings()
    await cleanupAfterTest(tracker, kysely)
  })

  it("starts switched off", async () => {
    expect(await isOnlinePaymentsEnabled()).toBe(false)
    expect(await getOnlinePaymentsSetting()).toMatchObject({
      switchedOn: false,
      asaasConfigured: true,
      enabled: false,
    })
  })

  it("is enabled once an admin switches it on", async () => {
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: uniqueEmail(),
      full_name: "Admin Souza",
    })

    await setOnlinePaymentsEnabled({ enabled: true, profileId: admin.id })

    expect(await isOnlinePaymentsEnabled()).toBe(true)
    expect(await getOnlinePaymentsSetting()).toMatchObject({
      switchedOn: true,
      enabled: true,
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      updatedByName: "Admin Souza",
    })
  })

  it("is disabled again once an admin switches it off", async () => {
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: uniqueEmail(),
    })

    await setOnlinePaymentsEnabled({ enabled: true, profileId: admin.id })
    await setOnlinePaymentsEnabled({ enabled: false, profileId: admin.id })

    expect(await isOnlinePaymentsEnabled()).toBe(false)
  })

  it("stays disabled while Asaas is not configured, whatever the switch says", async () => {
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: uniqueEmail(),
    })
    await setOnlinePaymentsEnabled({ enabled: true, profileId: admin.id })

    asaas.configured = false

    expect(await isOnlinePaymentsEnabled()).toBe(false)
    expect(await getOnlinePaymentsSetting()).toMatchObject({
      switchedOn: true,
      asaasConfigured: false,
      enabled: false,
    })
  })

  // The row hangs off profiles, so a TRUNCATE ... CASCADE on profiles takes it
  // too. Every page reads this setting; a missing row must not take them down.
  it("reads a missing row as switched off, and switching brings it back", async () => {
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: uniqueEmail(),
    })
    await kysely.deleteFrom("app_settings").execute()

    expect(await isOnlinePaymentsEnabled()).toBe(false)

    await setOnlinePaymentsEnabled({ enabled: true, profileId: admin.id })

    expect(await isOnlinePaymentsEnabled()).toBe(true)
  })
})
