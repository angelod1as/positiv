import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import type { Database } from "~types/database/kysely.types"
import { ENV } from "varlock/env"

const { SUPABASE_CONNECT_URL: supabaseConnectUrl } = ENV

// Not FULLY implemented right now
export const kyselyDb = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: supabaseConnectUrl,
    }),
  }),
})
