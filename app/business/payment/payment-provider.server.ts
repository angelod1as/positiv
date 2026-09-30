import type { PaymentProvider } from "./payment-provider"
import { asaasConnector } from "./provider/asaas/asaas-connector.server"

/** The one place a connector is chosen. */
export const paymentProvider = (): PaymentProvider => asaasConnector
