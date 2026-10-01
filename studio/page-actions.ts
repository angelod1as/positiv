import {
  type DocumentActionComponent,
  type DocumentActionProps,
  getPublishedId,
} from "sanity"

import { HOMEPAGE_PAGE_ID } from "./schemas/documents/page"

const removesThePage = ["delete", "unpublish"]

function isHomepage({ id }: DocumentActionProps) {
  return getPublishedId(id) === HOMEPAGE_PAGE_ID
}

function unlessHomepage(action: DocumentActionComponent) {
  const guarded: DocumentActionComponent = (props) => {
    const description = action(props)

    return isHomepage(props) ? null : description
  }

  guarded.action = action.action

  return guarded
}

export function pageActions(
  actions: DocumentActionComponent[],
  { schemaType }: { schemaType: string },
) {
  return schemaType === "page"
    ? actions.map((action) =>
        action.action && removesThePage.includes(action.action)
          ? unlessHomepage(action)
          : action,
      )
    : actions
}
