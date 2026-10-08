import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { presentationTool } from "sanity/presentation"
import { structureTool } from "sanity/structure"

import { dataset } from "./environment"
import { pageActions } from "./page-actions"
import { previewOrigin, resolve } from "./presentation"
import { schemaTypes } from "./schemas/schema-types"
import { singletonActions, withoutSingletons } from "./singletons"
import { structure } from "./structure"

export default defineConfig({
  name: "default",
  title: dataset === "production" ? "Positiv" : `Positiv (${dataset})`,

  projectId: "8ojkallk",
  dataset,

  plugins: [
    structureTool({ structure }),
    presentationTool({
      resolve,
      previewUrl: {
        initial: previewOrigin,
        previewMode: { enable: "/api/preview-mode/enable" },
      },
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (actions, context) =>
      pageActions(singletonActions(actions, context), context),
    newDocumentOptions: withoutSingletons,
  },
})
