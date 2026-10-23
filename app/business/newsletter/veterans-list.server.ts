import { kyselyDb } from "~/kysely-db"

export async function getConsentedVeteranEmails(): Promise<string[]> {
  const rows = await kyselyDb
    .selectFrom("profiles as p")
    .innerJoin("newsletter_subscriptions as ns", "ns.profile_id", "p.id")
    .select("p.email")
    .where("p.is_veteran", "=", true)
    .where("ns.consent_given", "=", true)
    .where("ns.sync_status", "<>", "unsubscribed")
    .execute()

  return rows.map((row) => row.email)
}
