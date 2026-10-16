export const PAYMENT_MESSAGE_VARIABLES = [
  "link",
  "data",
  "nome",
  "evento",
  "formas",
] as const

export type PaymentMessageVariable = (typeof PAYMENT_MESSAGE_VARIABLES)[number]

export type PaymentMessageValues = Record<PaymentMessageVariable, string>

const variablePattern = /\{\{\s*(\w+)\s*\}\}/g

export function unknownVariables(template: string): string[] {
  const unknown = new Set<string>()
  for (const match of template.matchAll(variablePattern)) {
    const name = match[1]
    if (!(PAYMENT_MESSAGE_VARIABLES as readonly string[]).includes(name)) {
      unknown.add(name)
    }
  }
  return [...unknown]
}

export function renderPaymentMessage(
  template: string,
  values: PaymentMessageValues,
): string {
  const unknown = unknownVariables(template)
  if (unknown.length > 0) {
    throw new Error(
      `The payment message uses unknown variables: ${unknown
        .map((name) => `{{${name}}}`)
        .join(", ")}`,
    )
  }

  return template.replace(
    variablePattern,
    (_match, name: string) => values[name as PaymentMessageVariable],
  )
}
