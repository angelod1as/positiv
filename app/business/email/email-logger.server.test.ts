import { describe, expect, it } from "vitest"
import TransportStream from "winston-transport"

import { logger } from "~/lib/logger/logger.server"
import { emailLogger } from "./email-logger.server"

class CaptureTransport extends TransportStream {
  entries: Record<string, unknown>[] = []
  log(info: Record<string, unknown>, callback: () => void) {
    this.entries.push(info)
    callback()
  }
}

describe("emailLogger", () => {
  it("tags every entry with the email category", () => {
    const capture = new CaptureTransport()
    logger.add(capture)

    emailLogger.error("boom", { template: "payment-link" })

    logger.remove(capture)
    expect(capture.entries[0]).toMatchObject({
      message: "boom",
      category: "email",
      template: "payment-link",
      incidentId: expect.stringMatching(/^[0-9a-f]{8}$/),
    })
  })
})
