import type { StructureBuilder } from "sanity/structure"
import { describe, expect, it } from "vitest"

import { structure } from "./structure"

type Node = {
  title?: string
  items?: Node[]
  child?: Node
  schemaType?: string
  divider?: true
}

// Records the titles and nesting the structure builds, so the test reads the
// sidebar as an editor sees it rather than the builder's internals.
function recorder(): StructureBuilder {
  const node = (initial: Partial<Node> = {}) => {
    const state: Node = { ...initial }
    const chain: Record<string, (...args: unknown[]) => unknown> = new Proxy(
      {},
      {
        get(_, method: string) {
          if (method === "state") return state
          return (value: unknown) => {
            if (method === "title") state.title = value as string
            if (method === "items")
              state.items = (value as { state: Node }[]).map(
                (item) => item.state,
              )
            if (method === "child") state.child = (value as { state: Node }).state
            if (method === "schemaType") state.schemaType = value as string
            return chain
          }
        },
      },
    )
    return chain
  }

  return {
    list: () => node(),
    listItem: () => node(),
    document: () => node(),
    divider: () => node({ divider: true }),
    documentTypeListItem: (type: string) => node({ schemaType: type }),
  } as unknown as StructureBuilder
}

function sidebar() {
  const root = structure(recorder(), {} as never) as unknown as { state: Node }
  return root.state.items ?? []
}

const titles = (nodes: Node[]) =>
  nodes.filter((node) => !node.divider).map((node) => node.title)

describe("structure", () => {
  it("splits the sidebar into the public site and the platform", () => {
    expect(titles(sidebar())).toEqual(["Site", "Plataforma"])
  })

  it("keeps the public site's content under Site", () => {
    const site = sidebar().find((node) => node.title === "Site")
    expect(titles(site?.child?.items ?? [])).toEqual([
      "Página inicial",
      "Páginas",
      "Configurações do site",
      "Pessoas",
    ])
  })

  it("keeps the text the platform sends and asks under Plataforma", () => {
    const platform = sidebar().find((node) => node.title === "Plataforma")
    expect(titles(platform?.child?.items ?? [])).toEqual([
      "E-mails",
      "Mensagens de pagamento",
      "Escala de Likert",
    ])
  })
})
