import { createContentCache } from "./content-cache.server"
import { getRules } from "./rules-source.server"

export const rulesCache = createContentCache({
  name: "Rules",
  load: () => getRules(),
})
