import { GENDERS } from "~/lib/constants/constants"

export type ProfileForGoogleContacts = {
  social_name: string | null
  full_name: string | null
  gender: string[] | null
  pronouns: string[] | null
}

type Gender = (typeof GENDERS)[number]

const GENDER_ABBREVIATIONS: Record<Gender, string> = {
  "Mulher cis": "MC",
  "Mulher trans": "MT",
  "Homem cis": "HC",
  "Homem trans": "HT",
  "Pessoa agênera": "AG",
  "Pessoa não binária": "NB",
  Travesti: "TRAV",
}

function getGenderAbbreviation(genders: string[]): string | null {
  for (const gender of genders) {
    const abbreviation = GENDER_ABBREVIATIONS[gender as Gender]
    if (abbreviation) return abbreviation
  }
  return null
}

export function formatParticipantNameForGoogleContacts(
  profile: ProfileForGoogleContacts,
): string {
  const name = profile.social_name || profile.full_name || ""

  const parts = [name]

  if (profile.full_name && profile.social_name) {
    parts.push(`(${profile.full_name})`)
  }

  if (profile.gender && profile.gender.length > 0) {
    const genderAbbr = getGenderAbbreviation(profile.gender)
    if (genderAbbr) {
      parts.push(genderAbbr)
    }
  }

  if (profile.pronouns && profile.pronouns.length > 0) {
    parts.push(`(${profile.pronouns.join(", ")})`)
  }

  parts.push("Positiv")

  return parts.join(" ")
}

export function generateGoogleContactsUrl(
  email: string,
  phone: string | number | null,
): string {
  const params = []
  params.push("hl=pt-BR")

  if (email) {
    params.push(`email=${encodeURIComponent(email).replace("%40", "@")}`)
  }

  if (phone) {
    params.push(`phone=${phone.toString()}`)
  }

  return `https://contacts.google.com/u/0/new?${params.join("&")}`
}
