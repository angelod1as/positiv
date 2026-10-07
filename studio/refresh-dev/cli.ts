import { createReadStream } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { exportDataset } from "@sanity/export"
import { sanityImport } from "@sanity/import"
import { getCliClient } from "sanity/cli"

import { run, type Store } from "./run"

// `sanity exec … --` forwards the script's own flags after the `--`, so slice
// from there and hand them to run().
const separator = process.argv.indexOf("--")

const { dryRun, source, target, before, deleted, imported, after } = await run(
  process.argv.slice(separator === -1 ? 2 : separator + 1),
  (sourceDataset, targetDataset): Store => {
    const base = getCliClient({ apiVersion: "2026-09-24" })
    // Read-only: production is only ever exported. Raw on both clients so
    // drafts are compared and imported too, for a true mirror.
    const sourceClient = base.withConfig({
      dataset: sourceDataset,
      perspective: "raw",
      useCdn: false,
    })
    // The only client that writes, and only ever to development.
    const targetClient = base.withConfig({
      dataset: targetDataset,
      perspective: "raw",
      useCdn: false,
    })

    const idsOf = (client: typeof base) => client.fetch<string[]>("*[]._id")

    let archive: string | undefined
    let directory: string | undefined

    const cleanup = async () => {
      if (directory) {
        await rm(directory, { recursive: true, force: true })
        directory = undefined
        archive = undefined
      }
    }

    return {
      sourceIds: () => idsOf(sourceClient),
      targetIds: () => idsOf(targetClient),
      exportSource: async () => {
        directory = await mkdtemp(join(tmpdir(), "refresh-dev-"))
        archive = join(directory, `${sourceDataset}.tar.gz`)
        try {
          await exportDataset({
            client: sourceClient,
            dataset: sourceDataset,
            outputPath: archive,
            assets: true,
          })
        } catch (error) {
          await cleanup()
          throw error
        }
      },
      deleteFromTarget: async (documentIds) => {
        await documentIds
          .reduce(
            (transaction, id) => transaction.delete(id),
            targetClient.transaction(),
          )
          .commit()
      },
      importToTarget: async () => {
        if (!archive) {
          throw new Error("exportSource must run before importToTarget")
        }
        try {
          await sanityImport(createReadStream(archive), {
            client: targetClient,
            operation: "createOrReplace",
          })
        } finally {
          await cleanup()
        }
      },
    }
  },
)

console.log(
  JSON.stringify({ source, target, before, deleted, imported, after }, null, 2),
)
console.log(
  dryRun
    ? `Dry run: nothing was written to ${target}. Add --no-dry-run to mirror ${source} into ${target}.`
    : `Mirrored ${source} into ${target}: deleted ${deleted.length}, imported ${imported}. ${target} now holds ${after} documents.`,
)
