import { z } from "zod"
import { validationMessages } from "./validation-messages"

const countableOrigins = ["array", "set", "file"]

z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        if (issue.input === undefined || issue.input === null) {
          return validationMessages.required
        }
        return validationMessages.invalid
      case "too_small": {
        const minimum = Number(issue.minimum)
        if (issue.origin === "string") {
          return minimum <= 1
            ? validationMessages.required
            : validationMessages.minLength(minimum)
        }
        if (countableOrigins.includes(issue.origin)) {
          return minimum <= 1
            ? validationMessages.required
            : validationMessages.minOptions(minimum)
        }
        if (["number", "int", "bigint"].includes(issue.origin)) {
          return validationMessages.minValue(minimum)
        }
        return validationMessages.invalid
      }
      case "too_big": {
        const maximum = Number(issue.maximum)
        if (issue.origin === "string") {
          return validationMessages.maxLength(maximum)
        }
        if (countableOrigins.includes(issue.origin)) {
          return validationMessages.maxOptions(maximum)
        }
        if (["number", "int", "bigint"].includes(issue.origin)) {
          return validationMessages.maxValue(maximum)
        }
        return validationMessages.invalid
      }
      case "invalid_format":
        if (issue.format === "email") {
          return validationMessages.invalidEmail
        }
        if (issue.format === "datetime" || issue.format === "date") {
          return validationMessages.invalidDate
        }
        return validationMessages.invalidFormat
      default:
        return validationMessages.invalid
    }
  },
})

export const zod = z
