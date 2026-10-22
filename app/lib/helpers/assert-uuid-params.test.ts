import { describe, expect, it } from "vitest"
import { assertUuidParams } from "./assert-uuid-params"

const UUID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"

function thrownBy(run: () => void) {
  try {
    run()
  } catch (error) {
    return error
  }
  return undefined
}

describe("assertUuidParams", () => {
  it("accepts a uuid", () => {
    expect(() => assertUuidParams(UUID)).not.toThrow()
  })

  it("accepts a uuid in upper case", () => {
    expect(() => assertUuidParams(UUID.toUpperCase())).not.toThrow()
  })

  it("accepts a param the route left out", () => {
    expect(() => assertUuidParams(undefined)).not.toThrow()
  })

  it("accepts several uuids", () => {
    expect(() => assertUuidParams(UUID, UUID, undefined)).not.toThrow()
  })

  it.each([
    "eventos",
    "",
    "novo",
    `${UUID}x`,
    ` ${UUID}`,
    UUID.replaceAll("-", ""),
    "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9g",
  ])("throws a 404 for %j", (value) => {
    const error = thrownBy(() => assertUuidParams(value))

    expect(error).toBeInstanceOf(Response)
    expect((error as Response).status).toBe(404)
  })

  it("throws a 404 when any one of several params is not a uuid", () => {
    const error = thrownBy(() => assertUuidParams(UUID, "eventos"))

    expect((error as Response).status).toBe(404)
  })
})
