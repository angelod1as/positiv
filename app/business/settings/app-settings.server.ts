import { db } from "~/lib/supabase/db.server"

export const getOnlinePaymentsSwitch = async () => {
  const row = await db
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
  return {
    switchedOn: row?.online_payments_enabled ?? false,
    updatedAt: row ? new Date(row.updated_at).toISOString() : null,
    updatedByName: row?.social_name || row?.full_name || null,
  }
}

export const isOnlinePaymentsSwitchedOn = async () => {
  const row = await db
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

  await db
    .insertInto("app_settings")
    .values({ id: true, ...values })
    .onConflict((oc) => oc.column("id").doUpdateSet(values))
    .execute()
}

export const isCardPaymentsEnabled = async () => {
  const row = await db
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

  await db
    .insertInto("app_settings")
    .values({ id: true, ...values })
    .onConflict((oc) => oc.column("id").doUpdateSet(values))
    .execute()
}

export const getRegistrationLimit = async () => {
  const row = await db
    .selectFrom("app_settings")
    .select("registration_limit")
    .executeTakeFirst()

  return row?.registration_limit ?? 90
}

export const setRegistrationLimit = async ({
  limit,
  profileId,
}: {
  limit: number
  profileId: string | undefined
}) => {
  const values = {
    registration_limit: limit,
    updated_at: new Date().toISOString(),
    updated_by: profileId ?? null,
  }

  await db
    .insertInto("app_settings")
    .values({ id: true, ...values })
    .onConflict((oc) => oc.column("id").doUpdateSet(values))
    .execute()
}
