import { zod } from "~/lib/helpers/zod"

const messages = {
  min2: "mínimo de 2 caracters",
  min1: "mínimo de 1 caracter",
  max1: "máximo de 1 caracter",
  max50: "máximo de 50 caracters",
  max255: "máximo de 255 caracters",
  emoji: "precisa ser um emoji",
  min1num: "mínimo 1",
}

const preprocessDateTime = (value: unknown) => {
  if (typeof value === "string") {
    if (value === "") return ""
    const date = new Date(value)
    return date.toISOString()
  }
  return value
}

const datetime = zod.preprocess(preprocessDateTime, zod.string().datetime())

export const eventFormSchema = zod.object({
  id: zod.string().optional(),
  title: zod.string().min(2).max(50),
  description: zod.string().min(2, messages.min2).max(255, messages.max255),
  emoji: zod.string().emoji(messages.emoji).min(1, messages.min1),
  location: zod.string().min(2, messages.min2).max(255, messages.max255),

  ticket_price: zod.coerce.number().min(1, messages.min1num),
  total_spots: zod.coerce.number().min(1, messages.min1num),

  starting_time: datetime,
  ending_time: datetime,
  application_close_time: datetime,
  application_open_time: datetime,
  interview_process_end: datetime,
  interview_process_start: datetime,
  group_open_date: datetime,
  group_close_date: datetime,
  payment_end_date: datetime,
  payment_start_date: datetime,
})
