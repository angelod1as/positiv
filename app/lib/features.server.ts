import { env } from "~/env.server"

export const FEATURES = {
  paymentSystem: env().enablePaymentSystem,
} as const

export function isPaymentSystemEnabled(): boolean {
  return FEATURES.paymentSystem
}
