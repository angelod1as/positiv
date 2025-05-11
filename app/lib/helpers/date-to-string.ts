export const dateToString = (date: Date | string) => {
  if (typeof date === "string") return date
  return date.toISOString()
}
