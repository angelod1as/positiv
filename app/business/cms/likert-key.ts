// The stable identifier of a Likert statement. Answers are stored
// against it, so it never changes once published.
export const LIKERT_KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/

export function duplicateKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const key of keys) {
    if (seen.has(key)) duplicates.add(key)
    seen.add(key)
  }
  return [...duplicates]
}
