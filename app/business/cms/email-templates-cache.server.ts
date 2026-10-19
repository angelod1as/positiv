import { createContentCache } from "./content-cache.server"
import { getEmailTemplates } from "./email-templates-source.server"

export const emailTemplatesCache = createContentCache({
  name: "email",
  load: () => getEmailTemplates(),
})
