import { describe, expect, it } from "vitest"
import { cmsPreviewCopy } from "~/copy/cms"
import { pageHeaderSchema, pageSectionDocumentSchema } from "./page.schema"

const STRUCTURAL = new Set(["_type", "_key"])

const contentKeys = new Set(
  [pageSectionDocumentSchema, pageHeaderSchema]
    .flatMap((union) => [...union.options])
    .flatMap((option) => Object.keys(option.shape))
    .filter((key) => !STRUCTURAL.has(key)),
)

describe("cmsPreviewCopy.fieldLabels", () => {
  it("has a pt-BR label for every Section and Page Header field", () => {
    const unlabeled = [...contentKeys].filter(
      (key) => !(key in cmsPreviewCopy.fieldLabels),
    )

    expect(unlabeled).toEqual([])
  })
})
