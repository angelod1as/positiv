export const MASK = "***"

// What an alert carries reaches a Telegram chat: a Postgres error's details
// quote the row ("Key (email)=(…)"), an upstream error its headers, a path the
// user's own address.
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g, `${MASK}@$1`)
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, MASK)
    .replace(/\b(Bearer )[\w.~+/=-]+/gi, `$1${MASK}`)
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g, MASK)
}
