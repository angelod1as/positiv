import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import type { Database } from "~types/database/kysely.types"
import { env } from "./env.server"

const { supabaseConnectUrl } = env()

// Not FULLY implemented right now
export const kysely = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: supabaseConnectUrl,
    }),
  }),
})
