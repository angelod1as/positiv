import { describe, expect, it } from "vitest"
import TransportStream from "winston-transport"

import { logger } from "~/lib/logger/logger.server"
import { paymentLogger } from "./payment-logger.server"

class CaptureTransport extends TransportStream {
  entries: Record<string, unknown>[] = []
  log(info: Record<string, unknown>, callback: () => void) {
    this.entries.push(info)
    callback()
  }
}

describe("paymentLogger", () => {
  it("tags every entry with the payments category", () => {
    const capture = new CaptureTransport()
    logger.add(capture)

    paymentLogger.error("boom", { paymentId: "pay-1" })

    logger.remove(capture)
    expect(capture.entries[0]).toMatchObject({
      message: "boom",
      category: "payments",
      paymentId: "pay-1",
      incidentId: expect.stringMatching(/^[0-9a-f]{8}$/),
    })
  })
})
