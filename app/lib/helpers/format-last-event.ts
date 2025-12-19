import { formatDateTime } from "./format-date-time"

export function formatLastEvent(
  title: string | null | undefined,
  date: string | null | undefined
): string {
  if (!title || !date) return "-"

  const formattedDate = formatDateTime(date, "numeric").date
  if (!formattedDate) return "-"

  const maxTitleLength = 20
  const truncatedTitle = title.length > maxTitleLength
    ? `${title.substring(0, maxTitleLength)}…`
    : title

  return `${formattedDate} - ${truncatedTitle}`
}
