import { z } from 'zod';

export const ProfileCSVRowSchema = z.object({
  nome: z.string({ required_error: "Nome é obrigatório" }).min(1, "Nome é obrigatório"),
  nome_social: z.string().optional(),
  genero: z.string().optional(),
  orientacao: z.string().optional(), 
  pronomes: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  celular: z.string().optional(),
  rg: z.string().optional(),
  bandeira: z.string().optional(),
  aprovado_futuras_festas: z.string().optional(),
  observacao: z.string().optional()
});

export type ProfileCSVRow = z.infer<typeof ProfileCSVRowSchema>;

export function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return phone;
  return phone.replace(/\D/g, '');
}