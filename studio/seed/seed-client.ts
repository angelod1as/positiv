import { getCliClient } from "sanity/cli"

import { datasetArgument } from "./dataset-argument"

export function seedClient(argv: string[]) {
  // getCliClient drops `dataset` unless `projectId` comes with it, and falls
  // back to sanity.cli.ts — which names production.
  const dataset = datasetArgument(argv)
  const client = getCliClient({
    apiVersion: "2026-09-24",
    perspective: "published",
  }).withConfig({
    dataset,
  })

  if (client.config().dataset !== dataset) {
    throw new Error(
      `Asked for "${dataset}" but the client points at "${client.config().dataset}"; nothing was written`,
    )
  }

  return client
}
