import { describe, expect, it } from "vitest"
import { getParticipantFullEventHistory } from "./profiles.server"

describe("getParticipantFullEventHistory", () => {
  it("should be defined with correct function signature", () => {
    expect(getParticipantFullEventHistory).toBeDefined()
    expect(typeof getParticipantFullEventHistory).toBe("function")
  })
})
