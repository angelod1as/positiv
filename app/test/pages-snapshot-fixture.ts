import fixture from "../../e2e/fixtures/pages-snapshot.json"
import {
  findPage,
  resolvePagesSnapshot,
} from "~/business/cms/pages-snapshot.server"

export const pagesSnapshotFixture = async () =>
  resolvePagesSnapshot(fixture, { projectId: "test", dataset: "development" })

export async function pageFixture(address: string) {
  const page = findPage(await pagesSnapshotFixture(), address)
  if (!page) throw new Error(`No Page at ${address} in the fixture`)
  return page
}
