import type { FC, PropsWithChildren } from "react"
// import { SupabaseClient } from "@supabase/supabase-js"
// import { Database } from "./database.types"

export type FCC<T = unknown> = FC<PropsWithChildren & T>
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}
// export type DBClient = SupabaseClient<Database, "public">
