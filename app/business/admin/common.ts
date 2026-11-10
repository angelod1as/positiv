import { zod } from "~/lib/helpers/zod"


import { userContextSchema } from "../common"

export const adminContextSchema = userContextSchema.extend({
  eventId: zod.string().optional(),
})
