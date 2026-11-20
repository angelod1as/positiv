import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"

export const emailPreferencesSchema = zod.object({
  registrationAlerts: zod.boolean(),
  newsletter: zod.boolean(),
  marketing: zod.boolean(),
})

export type EmailPreferences = z.infer<typeof emailPreferencesSchema>
