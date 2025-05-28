import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import type { Database } from "~types/kysely.types"
import { env } from "./env.server"

const { viteSupabaseUrl } = env()

export const kysely = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: viteSupabaseUrl,
    }),
  }),
})
