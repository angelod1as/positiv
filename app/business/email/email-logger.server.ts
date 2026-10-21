import { logger } from "~/lib/logger/logger.server"

export const emailLogger = logger.child({ category: "email" })
