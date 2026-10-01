import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"

import { dataset } from "./environment"
import { pageActions } from "./page-actions"
import { schemaTypes } from "./schemas/schema-types"
import { homepageActions, withoutSingletons } from "./singletons"
import { structure } from "./structure"

export default defineConfig({
  name: "default",
  title: dataset === "production" ? "Positiv" : `Positiv (${dataset})`,

  projectId: "8ojkallk",
  dataset,

  plugins: [structureTool({ structure }), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (actions, context) =>
      pageActions(homepageActions(actions, context), context),
    newDocumentOptions: withoutSingletons,
  },
})
