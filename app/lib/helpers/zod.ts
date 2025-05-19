import { z } from "zod"

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined") {
        return { message: "Obrigatório" }
      }
      return {
        message: `Tipos incorretos. Esperado: ${issue.expected}. Recebido: ${issue.received}`,
      }
    case z.ZodIssueCode.invalid_arguments:
      return { message: "Argumentos inválidos" }
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "datetime") {
        return { message: "Formato de data inválido" }
      }
      return { message: "Formato inválido" }
    case z.ZodIssueCode.invalid_date:
      return { message: "Data inválida" }
    case z.ZodIssueCode.too_big:
      return { message: `No máximo ${issue.maximum} caracteres` }
    case z.ZodIssueCode.too_small:
      return { message: `No mínimo ${issue.minimum} caracteres` }
    case z.ZodIssueCode.custom:
    default:
      return { message: ctx.defaultError }
  }
}

z.setErrorMap(customErrorMap)

export const zod = z
