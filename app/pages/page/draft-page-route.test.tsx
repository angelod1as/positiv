import { beforeEach, describe, expect, it, vi } from "vitest"
import { useQuery } from "~/business/cms/live-loader"
import { whatsAppButtonCopy } from "~/copy/layout"
import { headers as docHeaders, page as pageDocument } from "~/test/page-documents"
import { renderWithRouter, screen } from "~/test/test-utils"
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

function renderAt(address: string) {
  renderWithRouter(
    <DraftPageRoute
      initial={{ data: null } as never}
      query="the-snapshot-query"
      params={{}}
      clientConfig={clientConfig}
      address={address}
      events={undefined}
      isLoggedIn={false}
    />,
  )
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

  it("renders the Page the live data resolves to", () => {
    liveWith(home())

    renderAt("/")

    expect(
      screen.getByRole("link", { name: whatsAppButtonCopy.ariaLabel }),
    ).toBeInTheDocument()
  })

  it("follows the live data when the Studio pushes a change", () => {
    liveWith(pageDocument({ address: "/sobre", header: [docHeaders.pageTitle] }))

    const { rerender } = renderWithRouter(
      <DraftPageRoute
        initial={{ data: null } as never}
        query="the-snapshot-query"
        params={{}}
        clientConfig={clientConfig}
        address="/sobre"
        events={undefined}
        isLoggedIn={false}
      />,
    )
    expect(
      screen.getByText(docHeaders.pageTitle.title),
    ).toBeInTheDocument()

    liveWith(
      pageDocument({
        address: "/sobre",
        header: [{ ...docHeaders.pageTitle, title: "Título novo" }],
      }),
    )
    rerender(
      <DraftPageRoute
        initial={{ data: null } as never}
        query="the-snapshot-query"
        params={{}}
        clientConfig={clientConfig}
        address="/sobre"
        events={undefined}
        isLoggedIn={false}
      />,
    )

    expect(screen.getByText("Título novo")).toBeInTheDocument()
  })

  it("renders nothing when the live data has no Page at the address", () => {
    liveWith(pageDocument({ address: "/sobre", header: [docHeaders.pageTitle] }))

    const { container } = renderWithRouter(
      <DraftPageRoute
        initial={{ data: null } as never}
        query="the-snapshot-query"
        params={{}}
        clientConfig={clientConfig}
        address="/nao-existe"
        events={undefined}
        isLoggedIn={false}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
