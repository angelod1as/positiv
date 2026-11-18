import { createContentCache } from "./content-cache.server"
import { getLikertScale } from "./likert-scale-source.server"

export const likertScaleCache = createContentCache({
  name: "Likert scale",
  load: () => getLikertScale(),
})
