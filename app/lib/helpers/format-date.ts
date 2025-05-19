import { parseISO } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { ptBR } from "date-fns/locale"

type DateLengthOption = "long" | "short"

export function formatDateTime(
  dateString: string | null,
  lengthOption: DateLengthOption = "long",
  withHours: boolean = false,
): string | undefined {
  if (!dateString) return undefined

  const timeZone = "America/Sao_Paulo"
  const date = parseISO(dateString)

  let formatPattern: string

  switch (lengthOption) {
    case "short":
      formatPattern = "dd MMM. yy"
      break
    case "long":
    default:
      formatPattern = "dd 'de' MMMM 'de' yyyy"
      break
  }

  // Append the hour format if withHours is true
  if (withHours) {
    formatPattern += ", HH'h'"
  }

  // Format the date in the specified time zone and locale
  return formatInTimeZone(date, timeZone, formatPattern, { locale: ptBR })
}
