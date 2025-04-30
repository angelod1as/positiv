export function filterUndefined<T>(
  value: T | undefined | null | false | "",
): value is T {
  return Boolean(value)
}
