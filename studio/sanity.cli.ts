import { defineCliConfig } from "sanity/cli"

export default defineCliConfig({
  api: {
    projectId: "8ojkallk",
    dataset: "production",
  },
  studioHost: "positiv",
  deployment: {
    appId: "l5e0q3ft2d2rlhrtrjk4ilzz",
    autoUpdates: true,
  },
})
