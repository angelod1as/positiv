/**
 * Whether a write was refused by one particular unique index. Postgres names
 * the index in the message, and pg adds it as `constraint`; PostgREST passes
 * the message on but not the field, so the message is what both share.
 */
export function isUniqueViolation(error: unknown, index: string): boolean {
  if (!error || typeof error !== "object") return false
  const { code, message } = error as { code?: unknown; message?: unknown }
  return (
    code === "23505" && typeof message === "string" && message.includes(index)
  )
}
