export const POSITIV_URL = "https://www.positivparty.com/"

export const POSITIV_EMAIL = "contato@positivparty.com"

export const POSITIV_WHATSAPP = "5511945970336"

export const EVENT_PAGE_REGEXP =
  /dashboard\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

export const PHONE_REGEXP = /^(\d{2})?\d{2}\d{8,9}$/

export const GENDERS = [
  "Homem cis",
  "Homem trans",
  "Mulher cis",
  "Mulher trans",
  "Pessoa agênera",
  "Pessoa não binária",
  "Travesti",
] as const

export const ORIENTATIONS = [
  "Ace",
  "Bi",
  "Demi",
  "Gay",
  "Hétero",
  "Lésbica",
  "Pan",
] as const

export const PRONOUNS = [
  "Ela/dela",
  "Ele/dele",
  "Elu/delu",
  "Ile/dile",
] as const

export const RACE_COLOR = [
  "Amarela",
  "Branca",
  "Indígena",
  "Parda",
  "Preta",
] as const

export const LISTMONK_REGISTERED_LIST_ID = 1
export const LISTMONK_TEST_LIST_ID = 2

// Template IDs for Listmonk campaigns
// TODO POS-257: Replace with actual template ID after creating template in Listmonk UI
export const LISTMONK_EVENT_OPENING_TEMPLATE_ID = "REPLACE_WITH_TEMPLATE_ID"
