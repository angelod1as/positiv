import { sql } from "kysely"
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
  isCardPaymentsEnabled,
  isOnlinePaymentsEnabled,
  setCardPaymentsEnabled,
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

  // The E2E suite flips the switch through supabase-js as service_role. No
  // other Data API role may read or write it.
  it("is reachable through the Data API by service_role only", async () => {
    // One privilege per check: given a list, has_table_privilege answers true
    // when any one of them is held.
    const { rows } = await sql<{
      role: string
      privilege: string
      granted: boolean
    }>`
      SELECT r.role, p.privilege,
             has_table_privilege(r.role, 'public.app_settings', p.privilege) AS granted
      FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(role)
      CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE']) AS p(privilege)
    `.execute(kysely)

    expect(
      Object.fromEntries(
        rows.map((r) => [`${r.role} ${r.privilege}`, r.granted]),
      ),
    ).toEqual({
      "anon SELECT": false,
      "anon INSERT": false,
      "anon UPDATE": false,
      "authenticated SELECT": false,
      "authenticated INSERT": false,
      "authenticated UPDATE": false,
      "service_role SELECT": true,
      "service_role INSERT": true,
      "service_role UPDATE": true,
    })
  })
})

describe("card payments setting", () => {
  const { tracker, kysely } = setupIntegrationTest()

  const resetSettings = () =>
    kysely
      .insertInto("app_settings")
      .values({ id: true, card_payments_enabled: false, updated_by: null })
      .onConflict((oc) =>
        oc
          .column("id")
          .doUpdateSet({ card_payments_enabled: false, updated_by: null }),
      )
      .execute()

  beforeEach(async () => {
    tracker.clear()
    await resetSettings()
  })

  afterEach(async () => {
    await resetSettings()
    await cleanupAfterTest(tracker, kysely)
  })

  it("is enabled once an admin switches it on, and off again", async () => {
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: uniqueEmail(),
    })

    await setCardPaymentsEnabled({ enabled: true, profileId: admin.id })
    expect(await isCardPaymentsEnabled()).toBe(true)

    await setCardPaymentsEnabled({ enabled: false, profileId: admin.id })
    expect(await isCardPaymentsEnabled()).toBe(false)
  })

  it("leaves the online payments switch alone", async () => {
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: uniqueEmail(),
    })
    await setOnlinePaymentsEnabled({ enabled: true, profileId: admin.id })

    await setCardPaymentsEnabled({ enabled: true, profileId: admin.id })

    expect(await isOnlinePaymentsEnabled()).toBe(true)
    await setOnlinePaymentsEnabled({ enabled: false, profileId: admin.id })
    expect(await isCardPaymentsEnabled()).toBe(true)
  })

  it("reads a missing row as switched off, and switching brings it back", async () => {
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: uniqueEmail(),
    })
    await kysely.deleteFrom("app_settings").execute()

    expect(await isCardPaymentsEnabled()).toBe(false)

    await setCardPaymentsEnabled({ enabled: true, profileId: admin.id })

    expect(await isCardPaymentsEnabled()).toBe(true)
  })
})
