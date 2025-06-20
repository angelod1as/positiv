import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import type { Database } from "~types/kysely.types"
import { env } from "./env.server"

const { supabaseConnectUrl } = env()
console.log(`\n\n:DEV supabaseConnectUrl:\n`, supabaseConnectUrl, `\n\n`)

// Not properly used right now
export const kysely = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: supabaseConnectUrl,
    }),
  }),
})
