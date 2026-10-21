import { logger } from "~/lib/logger/logger.server"

export const paymentLogger = logger.child({ category: "payments" })
