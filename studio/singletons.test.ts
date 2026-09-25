import type { DocumentActionComponent, TemplateItem } from "sanity"
import { describe, expect, it } from "vitest"

import { homepageActions, withoutSingletons } from "./singletons"

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

describe("homepageActions", () => {
  it("keeps the homepage from being deleted, duplicated or unpublished", () => {
    expect(
      names(homepageActions(allActions, { schemaType: "homepage" })),
    ).toEqual(["publish", "discardChanges", "restore"])
  })

  it("leaves every other document's actions alone", () => {
    expect(homepageActions(allActions, { schemaType: "person" })).toEqual(
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
})
