export const POSITIV_URL = "https://www.positivparty.com/"

export const POSITIV_EMAIL = "contato@positivparty.com"

// NEWS_VERSION is a timestamp that triggers the news dialog when updated
// Update this to Date.now() whenever adding new news items
export const NEWS_VERSION = 1754514000000 // August 6, 2025 - Newsletter list view

export const EVENT_PAGE_REGEXP =
  /dashboard\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

export const PHONE_REGEXP = /^(\d{2})?\d{2}\d{8,9}$/

export const GENDERS = [
  "Mulher cis",
  "Mulher trans",
  "Travesti",
  "Pessoa não binária",
  "Pessoa agênera",
  "Homem trans",
  "Homem cis",
] as const

export const ORIENTATIONS = [
  "Hétero",
  "Gay",
  "Lésbica",
  "Bi",
  "Pan",
  "Demi",
  "Ace",
] as const

export const PRONOUNS = [
  "Ele/dele",
  "Ela/dela",
  "Elu/delu",
  "Ile/dile",
] as const
