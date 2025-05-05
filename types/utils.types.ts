import type { SupabaseClient } from "@supabase/supabase-js"
import type { FC, PropsWithChildren } from "react"
import type { Database } from "./database.types"
// import { SupabaseClient } from "@supabase/supabase-js"
// import { Database } from "./database.types"

export type FCC<T = unknown> = FC<PropsWithChildren & T>
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}

export type NullablePartial<T> = {
  [P in keyof T]: T[P] | null
}

export type DBClient = SupabaseClient<Database, "public">
