import type {
  DocumentActionComponent,
  DocumentActionProps,
  SanityDocument,
} from "sanity"
import { describe, expect, it } from "vitest"

import { pageActions } from "./page-actions"

function action(
  name: DocumentActionComponent["action"],
): DocumentActionComponent {
  return Object.assign(() => ({ label: name ?? "" }), { action: name })
}

const allActions = [
  action("publish"),
  action("discardChanges"),
  action("restore"),
  action("unpublish"),
  action("duplicate"),
  action("delete"),
]

function atAddress(address: string) {
  return { _id: "page", _type: "page", address } as unknown as SanityDocument
}

function shown(
  actions: DocumentActionComponent[],
  versions: Pick<DocumentActionProps, "draft" | "published">,
) {
  return actions
    .filter((candidate) => candidate({ ...versions } as DocumentActionProps))
    .map((candidate) => candidate.action)
}

describe("pageActions", () => {
  it("keeps the Page at / from being deleted or unpublished", () => {
    const actions = pageActions(allActions, { schemaType: "page" })

    expect(shown(actions, { draft: null, published: atAddress("/") })).toEqual([
      "publish",
      "discardChanges",
      "restore",
      "duplicate",
    ])
  })

  it("protects it while its draft is still unpublished", () => {
    const actions = pageActions(allActions, { schemaType: "page" })

    expect(shown(actions, { draft: atAddress("/"), published: null })).toEqual([
      "publish",
      "discardChanges",
      "restore",
      "duplicate",
    ])
  })

  it("protects it while a draft moves it away from /", () => {
    const actions = pageActions(allActions, { schemaType: "page" })

    expect(
      shown(actions, {
        draft: atAddress("/inicio"),
        published: atAddress("/"),
      }),
    ).toEqual(["publish", "discardChanges", "restore", "duplicate"])
  })

  it("lets any other Page be deleted or unpublished", () => {
    const actions = pageActions(allActions, { schemaType: "page" })

    expect(
      shown(actions, { draft: null, published: atAddress("/sobre") }),
    ).toEqual(names(allActions))
  })

  it("leaves other documents' actions alone", () => {
    expect(pageActions(allActions, { schemaType: "person" })).toEqual(
      allActions,
    )
  })
})

function names(actions: DocumentActionComponent[]) {
  return actions.map((candidate) => candidate.action)
}
