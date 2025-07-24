import type { KyselifyDatabase } from "kysely-supabase"
import type { Database as SupabaseDatabase } from "./database.types"

export type Database = KyselifyDatabase<SupabaseDatabase>
