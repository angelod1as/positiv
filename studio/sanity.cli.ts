import { defineCliConfig } from "sanity/cli"

export default defineCliConfig({
  api: {
    projectId: "8ojkallk",
    dataset: "production",
  },
  studioHost: "positiv",
  deployment: {
    autoUpdates: true,
  },
})
