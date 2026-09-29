import { createContentCache } from "./content-cache.server"
import { getHomepageContent } from "./homepage-content.server"

export const homepageContentCache = createContentCache({
  name: "homepage",
  load: () => getHomepageContent(),
})
