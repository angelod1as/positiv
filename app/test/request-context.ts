import type { z } from "zod"
import type { requestContextSchema } from "~/business/common"

/** The admin settings `getContext` carries, as a fresh install has them. */
export const defaultSettings: z.infer<typeof requestContextSchema>["settings"] =
  {
    onlinePayments: {
      switchedOn: false,
      asaasConfigured: false,
      enabled: false,
      updatedAt: null,
      updatedByName: null,
    },
  }
