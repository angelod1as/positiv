import { parseArgs } from "node:util"

export const REFRESH_DEV_SOURCE = "production"
export const REFRESH_DEV_TARGET = "development"

const usage = "Usage: refresh-dev [--no-dry-run]"

export type Store = {
  sourceIds(): Promise<string[]>
  targetIds(): Promise<string[]>
  exportSource(): Promise<void>
  deleteFromTarget(ids: string[]): Promise<void>
  importToTarget(): Promise<void>
}

export type RefreshDevResult = {
  dryRun: boolean
  source: string
  target: string
  before: number
  deleted: string[]
  imported: number
  after: number
}

export async function run(
  args: string[],
  connect: (source: string, target: string) => Store,
): Promise<RefreshDevResult> {
  const { values } = parseArgs({
    args,
    options: {
      target: { type: "string" },
      "no-dry-run": { type: "boolean", default: false },
    },
  })

  if (values.target !== undefined && values.target !== REFRESH_DEV_TARGET) {
    throw new Error(
      `refresh-dev only ever writes to ${REFRESH_DEV_TARGET}, never to "${values.target}". ${usage}`,
    )
  }

  const store = connect(REFRESH_DEV_SOURCE, REFRESH_DEV_TARGET)
  const dryRun = !values["no-dry-run"]

  const [sourceIds, targetIds] = await Promise.all([
    store.sourceIds(),
    store.targetIds(),
  ])

  const source = new Set(sourceIds)
  const deleted = targetIds.filter((id) => !source.has(id))

  if (!dryRun) {
    // Export first, so a failed export leaves development untouched. Delete
    // last, after the import: deleting the dev-only documents while older copies
    // of production documents still reference them trips Sanity's
    // referential-integrity check, and by the time the import has replaced those
    // copies nothing points at the leftovers any more.
    await store.exportSource()
    await store.importToTarget()
    if (deleted.length > 0) {
      await store.deleteFromTarget(deleted)
    }
  }

  return {
    dryRun,
    source: REFRESH_DEV_SOURCE,
    target: REFRESH_DEV_TARGET,
    before: targetIds.length,
    deleted,
    imported: sourceIds.length,
    after: dryRun ? targetIds.length : (await store.targetIds()).length,
  }
}
