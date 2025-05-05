import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Insira pelo menos um caracter")
    .email("E-mail inválido"),
  password: z.string().min(1, "Insira pelo menos um caracter"),
})
