import type { DocumentActionComponent, TemplateItem } from "sanity"
import { describe, expect, it } from "vitest"

import { singletonActions, withoutSingletons } from "./singletons"

function action(
  name: DocumentActionComponent["action"],
): DocumentActionComponent {
  return Object.assign(() => null, { action: name })
}

const allActions = [
  action("publish"),
  action("discardChanges"),
  action("restore"),
  action("unpublish"),
  action("duplicate"),
  action("delete"),
]

function names(actions: DocumentActionComponent[]) {
  return actions.map((candidate) => candidate.action)
}

describe("singletonActions", () => {
  it("keeps the homepage from being deleted, duplicated or unpublished", () => {
    expect(
      names(singletonActions(allActions, { schemaType: "homepage" })),
    ).toEqual(["publish", "discardChanges", "restore"])
  })

  it("keeps Site Settings from being deleted, duplicated or unpublished", () => {
    expect(
      names(singletonActions(allActions, { schemaType: "siteSettings" })),
    ).toEqual(["publish", "discardChanges", "restore"])
  })

  it("leaves every other document's actions alone", () => {
    expect(singletonActions(allActions, { schemaType: "person" })).toEqual(
      allActions,
    )
  })
})

describe("withoutSingletons", () => {
  it("offers people, but not a second homepage, when creating a document", () => {
    const templates: TemplateItem[] = [
      { templateId: "homepage" },
      { templateId: "person" },
    ]

    expect(withoutSingletons(templates)).toEqual([{ templateId: "person" }])
  })

  it("does not offer a second Site Settings when creating a document", () => {
    const templates: TemplateItem[] = [
      { templateId: "siteSettings" },
      { templateId: "page" },
    ]

    expect(withoutSingletons(templates)).toEqual([{ templateId: "page" }])
  })
})
