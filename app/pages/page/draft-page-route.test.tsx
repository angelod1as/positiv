import { beforeEach, describe, expect, it, vi } from "vitest"
import { useQuery } from "~/business/cms/live-loader"
import { headers as docHeaders, page as pageDocument } from "~/test/page-documents"
import { render } from "~/test/test-utils"
import { DraftPageRoute } from "./draft-page-route"

vi.mock("~/business/cms/live-loader", () => ({ useQuery: vi.fn() }))

const clientConfig = {
  projectId: "8ojkallk",
  dataset: "development",
  apiVersion: "2026-09-24",
}

function liveWith(...docs: unknown[]) {
  vi.mocked(useQuery).mockReturnValue({
    data: { pages: docs, siteSettings: null },
  } as unknown as ReturnType<typeof useQuery>)
}

function renderAt(address: string, onPage = vi.fn()) {
  render(
    <DraftPageRoute
      initial={{ data: null } as never}
      query="the-snapshot-query"
      params={{}}
      clientConfig={clientConfig}
      address={address}
      onPage={onPage}
    />,
  )
  return onPage
}

const home = () =>
  pageDocument({ _id: "page-home", address: "/", header: [docHeaders.homepageHero] })

describe("DraftPageRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("subscribes to the live query the loader handed it", () => {
    liveWith(home())

    renderAt("/")

    expect(useQuery).toHaveBeenCalledWith(
      "the-snapshot-query",
      {},
      { initial: { data: null } },
    )
  })

  it("reports the Page the live data resolves to", () => {
    liveWith(home())

    const onPage = renderAt("/")

    expect(onPage).toHaveBeenCalledWith(
      expect.objectContaining({ address: "/" }),
    )
  })

  it("reports the new Page when the Studio pushes a change", () => {
    liveWith(
      pageDocument({
        address: "/sobre",
        header: [{ ...docHeaders.pageTitle, title: "Título novo" }],
      }),
    )

    const onPage = renderAt("/sobre")

    expect(onPage).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "/sobre",
        header: expect.objectContaining({ title: "Título novo" }),
      }),
    )
  })

  it("reports null when the live data has no Page at the address", () => {
    liveWith(pageDocument({ address: "/sobre", header: [docHeaders.pageTitle] }))

    const onPage = renderAt("/nao-existe")

    expect(onPage).toHaveBeenCalledWith(null)
  })

  it("reports null rather than throwing when the live data is malformed", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { not: "a snapshot" },
    } as unknown as ReturnType<typeof useQuery>)

    const onPage = renderAt("/")

    expect(onPage).toHaveBeenCalledWith(null)
  })
})
