/* eslint-disable @typescript-eslint/no-explicit-any */
// Any is necessary in this file

import { formatISO, parse } from "date-fns"
import { fromZonedTime, toZonedTime } from "date-fns-tz"
import { format } from "date-fns/format"
import type { EventStatus } from "~types/entities.types"
import { dateRegex, dateTimeFormat } from "../utils"

type Primitive = string | number | EventStatus | boolean

type Transform<T extends Record<string, Primitive | null>> = {
  [K in keyof T]: T[K] extends string
    ? T[K] extends `${infer _Y}-${infer _M}-${infer _D}T${infer _H}:${infer _Min}:${infer _S}${infer _TZ}`
      ? Date
      : string
    : T[K] extends number
      ? number
      : never
}

export function dbValuesToFormSchema<
  T extends Record<string, Primitive | null>,
  K extends Transform<T>,
>(obj: T): K {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value === null) {
      ;(acc as any)[key] = undefined
    } else if (typeof value === "string" && dateRegex.test(value)) {
      ;(acc as any)[key] = format(new Date(value), dateTimeFormat)
    } else {
      ;(acc as any)[key] = value
    }
    return acc
  }, {} as K)
}

export function schemaValuesToDB<
  T extends Record<string, any>,
  K extends Transform<T>,
>(obj: T, timeZone: string = "America/Sao_Paulo"): K {
  const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/ // Adjust this regex if needed

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value === undefined) {
      ;(acc as any)[key] = null
    } else if (typeof value === "string" && dateRegex.test(value)) {
      const parsedDate = parse(value, dateTimeFormat, new Date())
      const zonedDate = toZonedTime(parsedDate, timeZone)
      const utcDate = fromZonedTime(zonedDate, timeZone)
      ;(acc as any)[key] = formatISO(utcDate)
    } else {
      ;(acc as any)[key] = value
    }
    return acc
  }, {} as K)
}
