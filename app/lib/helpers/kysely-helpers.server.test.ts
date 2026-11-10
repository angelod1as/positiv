import { NoResultError, SelectQueryNode } from "kysely"
import { describe, expect, it } from "vitest"
import { isNoResultError } from "./kysely-helpers.server"

describe("isNoResultError", () => {
  it("recognises the error Kysely throws when a query finds no row", () => {
    const error = new NoResultError(SelectQueryNode.create())

    expect(isNoResultError(error)).toBe(true)
  })

  it("does not mistake any other failure for a missing row", () => {
    expect(isNoResultError(new Error("connection refused"))).toBe(false)
  })
})
