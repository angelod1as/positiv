import { kyselyDb } from "~/kysely-db"
import { paymentProvider } from "~/business/payment/payment-provider.server"

/**
 * The secrets say whether the payment provider can be reached at all. The
 * admin switch says whether it should be. Online payments need both.
 */
export const isAsaasConfigured = () => paymentProvider().isConfigured()

export const getOnlinePaymentsSetting = async () => {
  const row = await kyselyDb
    .selectFrom("app_settings as s")
    .leftJoin("profiles as p", "p.id", "s.updated_by")
    .select([
      "s.online_payments_enabled",
      "s.updated_at",
      "p.social_name",
      "p.full_name",
    ])
    .executeTakeFirst()

  // The row hangs off profiles, so a TRUNCATE ... CASCADE there empties the
  // table. Every page reads this; a missing row is the default, off.
  const switchedOn = row?.online_payments_enabled ?? false
  const asaasConfigured = isAsaasConfigured()

  return {
    switchedOn,
    asaasConfigured,
    enabled: asaasConfigured && switchedOn,
    updatedAt: row ? new Date(row.updated_at).toISOString() : null,
    updatedByName: row?.social_name || row?.full_name || null,
  }
}

export const isOnlinePaymentsEnabled = async () => {
  if (!isAsaasConfigured()) return false

  const row = await kyselyDb
    .selectFrom("app_settings")
    .select("online_payments_enabled")
    .executeTakeFirst()

  return row?.online_payments_enabled ?? false
}

export const setOnlinePaymentsEnabled = async ({
  enabled,
  profileId,
}: {
  enabled: boolean
  profileId: string | undefined
}) => {
  const values = {
    online_payments_enabled: enabled,
    updated_at: new Date().toISOString(),
    updated_by: profileId ?? null,
  }

  await kyselyDb
    .insertInto("app_settings")
    .values({ id: true, ...values })
    .onConflict((oc) => oc.column("id").doUpdateSet(values))
    .execute()
}

export const isCardPaymentsEnabled = async () => {
  const row = await kyselyDb
    .selectFrom("app_settings")
    .select("card_payments_enabled")
    .executeTakeFirst()

  return row?.card_payments_enabled ?? false
}

export const setCardPaymentsEnabled = async ({
  enabled,
  profileId,
}: {
  enabled: boolean
  profileId: string | undefined
}) => {
  const values = {
    card_payments_enabled: enabled,
    updated_at: new Date().toISOString(),
    updated_by: profileId ?? null,
  }

  await kyselyDb
    .insertInto("app_settings")
    .values({ id: true, ...values })
    .onConflict((oc) => oc.column("id").doUpdateSet(values))
    .execute()
}
