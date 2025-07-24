import type { SupabaseClient } from "@supabase/supabase-js"
import type { FC, PropsWithChildren } from "react"
import type { Database } from "../database/database.types"

export type FCC<T = unknown> = FC<PropsWithChildren & T>
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}

export type Nullable<T> = {
  [P in keyof T]: T[P] | null
}

export type NullablePartial<T> = {
  [P in keyof T]: T[P] | null | undefined
}

export type DBClient = SupabaseClient<Database, "public">
