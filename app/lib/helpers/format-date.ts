import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { ptBR } from "date-fns/locale"

// Format date to Brazilian format (short month)
type FormatDate = (
  props: Intl.DateTimeFormatOptions & {
    date: string | null
  },
) => string | undefined

// TODO: Refactor this for more uses. See the function below.
export const formatDate: FormatDate = ({ date, month }) => {
  if (!date) return undefined

  const dateObj = new Date(date)
  const currentYear = new Date().getFullYear()
  const dateYear = dateObj.getFullYear()

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: month || "short",
  }

  if (dateYear > currentYear) {
    options.year = "2-digit" // Add year if it's a future year
  }

  return dateObj.toLocaleDateString("pt-BR", options)
}

export function formatDateTime(
  dateString: string | null,
  options?: { showMinutes?: boolean },
) {
  if (!dateString) return { date: undefined, time: undefined }

  // Define the IANA time zone for GMT-3
  const timeZone = "America/Sao_Paulo"

  // Convert the date string to a Date object in the specified time zone
  const date = new Date(dateString)

  // Format the date in Portuguese (Brazil) locale
  const formattedDate = format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  // Format the time in the specified time zone
  const formattedTime = formatInTimeZone(
    date,
    timeZone,
    `HH'h'${options?.showMinutes ? "mm" : ""}`,
  )

  return {
    date: formattedDate,
    time: formattedTime,
  }
}
