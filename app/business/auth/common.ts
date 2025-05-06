import type { SupabaseClient } from "@supabase/supabase-js"
import { z, ZodType } from "zod"
import type { Database } from "~types/database.types"
import type { ProfileWithRoles } from "~types/entities.types"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Insira pelo menos um caracter")
    .email("E-mail inválido"),
  password: z.string().min(1, "Insira pelo menos um caracter"),
})

export const currentUserSchema = z.object({
  id: z.string(),
})

export const currentProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  basic_data_filled: z.boolean(),
  social_name: z.string(),
  pronouns: z.array(z.string()),
  rg: z.string(),
  cpf: z.string(),
  phone: z.number(),
  date_of_birth: z.string(),
  gender: z.array(z.string()),
  orientation: z.array(z.string()),
  where_lives: z.string(),
  how_came_to_us: z.string(),
  rg_issuer: z.string(),
  allow_marketing_email: z.boolean(),
  created_at: z.string(),
  is_admin: z.boolean(),
  roles: z.array(z.string()),
}) satisfies ZodType<ProfileWithRoles>

export const contextSchema = z.object({
  supabase: z.custom<SupabaseClient<Database, "public">>(),
  supabaseHeaders: z.custom<Headers>(),
  currentUser: currentUserSchema.nullable(),
  currentProfile: currentProfileSchema.nullable(),
})

export const userContextSchema = contextSchema.extend({
  currentUser: currentUserSchema,
})
