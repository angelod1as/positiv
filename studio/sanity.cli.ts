import { defineCliConfig } from "sanity/cli"

import { dataset } from "./environment"

export default defineCliConfig({
  api: {
    projectId: "8ojkallk",
    dataset,
  },
  studioHost: "positiv",
  deployment: {
    appId: "l5e0q3ft2d2rlhrtrjk4ilzz",
    autoUpdates: true,
  },
})
