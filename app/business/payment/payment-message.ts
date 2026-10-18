import {
  renderTemplate,
  unknownVariables as unknownVariablesIn,
} from "~/business/cms/placeholders"

export const PAYMENT_MESSAGE_VARIABLES = [
  "link",
  "data",
  "nome",
  "evento",
  "formas",
] as const

export type PaymentMessageVariable = (typeof PAYMENT_MESSAGE_VARIABLES)[number]

export type PaymentMessageValues = Record<PaymentMessageVariable, string>

export function unknownVariables(template: string): string[] {
  return unknownVariablesIn(template, PAYMENT_MESSAGE_VARIABLES)
}

export function renderPaymentMessage(
  template: string,
  values: PaymentMessageValues,
): string {
  return renderTemplate(template, values, PAYMENT_MESSAGE_VARIABLES)
}
