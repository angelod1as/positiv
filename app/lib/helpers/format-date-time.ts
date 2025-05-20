import { parseISO } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { ptBR } from "date-fns/locale"

// Define the type for length options
type DateLengthOption = "long" | "short"

export function formatDateTime(
  dateString: string | null | undefined,
  lengthOption: DateLengthOption = "long",
): {
  full: string | undefined
  date: string | undefined
  time: string | undefined
} {
  if (!dateString) return { full: undefined, date: undefined, time: undefined }

  const timeZone = "America/Sao_Paulo"
  const date = parseISO(dateString)

  let datePattern: string
  const timePattern = "HH'h'"

  switch (lengthOption) {
    case "short":
      datePattern = "dd MMM. yy"
      break
    case "long":
    default:
      datePattern = "dd 'de' MMMM 'de' yyyy"
      break
  }

  const formattedDate = formatInTimeZone(date, timeZone, datePattern, {
    locale: ptBR,
  })
  const formattedTime = formatInTimeZone(date, timeZone, timePattern, {
    locale: ptBR,
  })
  const fullDateTime = `${formattedDate}, às ${formattedTime}`

  return {
    full: fullDateTime,
    date: formattedDate,
    time: formattedTime,
  }
}
