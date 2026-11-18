import { describe, expect, it } from "vitest"
import { duplicateKeys, LIKERT_KEY_PATTERN } from "./likert-key"

describe("duplicateKeys", () => {
  it("finds nothing when every key is unique", () => {
    expect(duplicateKeys(["a", "b", "c"])).toEqual([])
  })

  it("names each repeated key once", () => {
    expect(duplicateKeys(["a", "b", "a", "a", "c", "b"])).toEqual(["a", "b"])
  })
})

describe("LIKERT_KEY_PATTERN", () => {
  it.each(["exemplo-01", "3f1c9a2e-7b4d-4e8a-9c1f-0a2b3c4d5e6f", "sauna"])(
    "accepts %s",
    (key) => {
      expect(LIKERT_KEY_PATTERN.test(key)).toBe(true)
    },
  )

  it.each(["", "-sauna", "Sauna", "casa de swing", "café"])(
    "rejects %s",
    (key) => {
      expect(LIKERT_KEY_PATTERN.test(key)).toBe(false)
    },
  )
})
