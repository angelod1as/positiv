import { describe, expect, it } from "vitest"
import { paymentMessagesSchema } from "./payment-messages.schema"

describe("paymentMessagesSchema", () => {
  it("accepts a message using the documented variables", () => {
    const result = paymentMessagesSchema.safeParse({
      whatsappMessage: "Pague {{nome}} em {{link}} até {{data}}. {{formas}}",
    })

    expect(result.success).toBe(true)
  })

  it("rejects a message using an unknown variable", () => {
    const result = paymentMessagesSchema.safeParse({
      whatsappMessage: "Pague em {{boleto}}.",
    })

    expect(result.success).toBe(false)
  })

  it("requires the message", () => {
    expect(paymentMessagesSchema.safeParse({}).success).toBe(false)
  })
})
