import { z } from "zod"

z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        if (issue.received === "undefined") {
          return "Obrigatório"
        }
        return `Tipos incorretos. Esperado: ${issue.expected}. Recebido: ${issue.received}`
      case "invalid_format":
        if (
          "validation" in issue &&
          typeof issue.validation === "string" &&
          issue.validation === "datetime"
        ) {
          return "Formato de data inválido"
        }
        return "Formato inválido"
      case "too_big":
        return `No máximo ${issue.maximum} caracteres`
      case "too_small":
        return `No mínimo ${issue.minimum} caracteres`
      case "custom":
      default:
        return undefined
    }
  },
})

export const zod = z
