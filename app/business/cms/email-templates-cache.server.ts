import { createContentCache } from "./content-cache.server"
import { getEmailTemplates } from "./email-templates-source.server"

// A cache of its own, read only when an email is sent, so email copy never
// enters the per-navigation site snapshot that every page load pays for.
export const emailTemplatesCache = createContentCache({
  name: "email",
  load: () => getEmailTemplates(),
})
