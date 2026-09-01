import { describe, expect, it } from "vitest"
import { assertLocalDatabaseUrl } from "./assert-local-database"

describe("assertLocalDatabaseUrl", () => {
  it("accepts the local database", () => {
    const url = "postgresql://tester:hunter2@127.0.0.1:54322/postgres"

    expect(assertLocalDatabaseUrl(url)).toBe(url)
    expect(
      assertLocalDatabaseUrl("postgresql://tester:hunter2@localhost:54322/postgres"),
    ).toBeTruthy()
  })

  it("refuses a remote host", () => {
    expect(() =>
      assertLocalDatabaseUrl(
        "postgresql://postgres.abcdefghijklmnop:hunter2@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
      ),
    ).toThrow(/aws-0-sa-east-1\.pooler\.supabase\.com/)
  })

  it("keeps the credentials out of the message it throws", () => {
    expect(() =>
      assertLocalDatabaseUrl(
        "postgresql://postgres.abcdefghijklmnop:hunter2@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
      ),
    ).toThrow(expect.not.stringContaining("hunter2"))
    expect(() =>
      assertLocalDatabaseUrl(
        "postgresql://postgres.abcdefghijklmnop:hunter2@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
      ),
    ).toThrow(expect.not.stringContaining("postgres.abcdefghijklmnop"))
  })

  it("refuses an unset or unparseable connection string", () => {
    expect(() => assertLocalDatabaseUrl(undefined)).toThrow(
      /SUPABASE_CONNECT_URL/,
    )
    expect(() => assertLocalDatabaseUrl("not a url")).toThrow(
      /SUPABASE_CONNECT_URL/,
    )
  })
})
