/**
 * The integration suite wipes whole tables and puts them back from a snapshot
 * it takes first. Pointed anywhere but the local database that is not a failed
 * test run, it is a production incident — so the connection string is checked
 * before anything opens a pool, and an unexpected host stops the run instead of
 * trusting whatever `.env` happens to hold.
 *
 * The host is the only part of the string that ever reaches an error message:
 * the rest of it is a credential.
 */
const LOCAL_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "host.docker.internal",
])

export function assertLocalDatabaseUrl(
  connectionString: string | undefined,
): string {
  if (!connectionString) {
    throw new Error("SUPABASE_CONNECT_URL environment variable is not set")
  }

  let host: string
  try {
    host = new URL(connectionString).hostname
  } catch {
    throw new Error("SUPABASE_CONNECT_URL is not a valid connection string")
  }

  const normalized = host.replace(/^\[|\]$/g, "")

  if (!LOCAL_HOSTS.has(normalized)) {
    throw new Error(
      `Refusing to run integration tests against "${host}": they truncate and restore whole tables, and this is not the local database. Point SUPABASE_CONNECT_URL at 127.0.0.1 and run them again.`,
    )
  }

  return connectionString
}
