export function paymentMessagesDocument(
  overrides: Record<string, unknown> = {},
) {
  return {
    _id: "paymentMessages",
    _type: "paymentMessages",
    whatsappMessage:
      "Oi, {{nome}}! Pague {{evento}} em {{link}} até {{data}}. {{formas}}",
    ...overrides,
  }
}
