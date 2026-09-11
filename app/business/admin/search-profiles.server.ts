import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"

const RESULT_LIMIT = 5

/**
 * One field, four columns. `profiles.phone` is a number, so a term that still
 * has digits once its punctuation is stripped is compared against the number's
 * text, and everything else is matched as a name, a social name or an email.
 *
 * `unaccent` is what lets "Goncalves" find "Gonçalves" -- the admin types what
 * they heard, not what the person registered.
 */
export async function searchProfilesForInvite(eventId: string, term: string) {
  const trimmed = term.trim()
  if (!trimmed) return []

  // `%` and `_` are wildcards to ILIKE, so a name carrying one would quietly
  // match far more than the admin typed. Backslash is Postgres's default
  // escape character, and it has to be escaped first or it would escape the
  // escapes.
  const literal = trimmed.replace(/[\\%_]/g, (match) => `\\${match}`)
  const like = `%${literal}%`
  const digits = trimmed.replace(/\D/g, "")

  // Only a term that is a phone number searches phone numbers. Sifting the
  // digits out of anything typed would turn a name that happens to carry one
  // into a fragment matched against every number in the table.
  const isPhoneQuery = /^[\d\s()+.-]+$/.test(trimmed) && digits.length >= 8

  return await kyselyDb
    .selectFrom("profiles")
    .select((eb) => [
      "profiles.id",
      "profiles.full_name",
      "profiles.social_name",
      "profiles.email",
      "profiles.phone",
      eb
        .exists(
          eb
            .selectFrom("event_participants")
            .select("event_participants.id")
            .whereRef("event_participants.profile_id", "=", "profiles.id")
            .where("event_participants.event_id", "=", eventId),
        )
        .as("is_participant"),
    ])
    .where((eb) =>
      eb.or([
        sql<boolean>`extensions.unaccent(coalesce(profiles.full_name, '')) ilike extensions.unaccent(${like})`,
        sql<boolean>`extensions.unaccent(coalesce(profiles.social_name, '')) ilike extensions.unaccent(${like})`,
        eb("profiles.email", "ilike", like),
        ...(isPhoneQuery
          ? [sql<boolean>`profiles.phone::text like ${`%${digits}%`}`]
          : []),
      ]),
    )
    .orderBy("profiles.full_name", "asc")
    .limit(RESULT_LIMIT)
    .execute()
}

export type InviteSearchResult = Awaited<
  ReturnType<typeof searchProfilesForInvite>
>[number]
