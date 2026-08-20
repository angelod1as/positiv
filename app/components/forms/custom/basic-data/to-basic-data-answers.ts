import type { Answers } from "~/components/forms/runtime/question.types"

type ProfileLike = {
  full_name?: string | null
  social_name?: string | null
  date_of_birth?: string | null
  where_lives?: string | null
  how_came_to_us?: string | null
  phone?: number | null
  cpf?: string | null
  rg?: string | null
  rg_issuer?: string | null
  gender?: string[] | null
  orientation?: string[] | null
  pronouns?: string[] | null
  race_color?: string[] | null
}

const TEXT_FIELDS = [
  "full_name",
  "social_name",
  "where_lives",
  "how_came_to_us",
  "cpf",
  "rg",
  "rg_issuer",
] as const

const LIST_FIELDS = ["gender", "orientation", "pronouns", "race_color"] as const

/**
 * What a profile already knows, in the shape the run reads.
 *
 * A field the profile has not answered is left out rather than handed over
 * empty: an answer of "" is an answer, and it would fail the question's own
 * rules before anyone had the chance to write one.
 */
export function toBasicDataAnswers(profile: ProfileLike | null): Answers {
  if (!profile) return {}

  const answers: Answers = {}

  for (const field of TEXT_FIELDS) {
    const value = profile[field]
    if (value) answers[field] = value
  }

  for (const field of LIST_FIELDS) {
    const value = profile[field]
    if (value?.length) answers[field] = value
  }

  // The column is a date and the control is a date field, which reads the day
  // alone — a profile carrying the time of day would show up empty.
  if (profile.date_of_birth) {
    answers.date_of_birth = profile.date_of_birth.slice(0, 10)
  }

  // Written as text because that is what the number field reads back, and
  // confirmed with itself: nobody should retype a number they already gave us.
  if (profile.phone !== null && profile.phone !== undefined) {
    answers.phone = String(profile.phone)
    answers.confirm_phone = String(profile.phone)
  }

  return answers
}
