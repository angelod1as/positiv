import type { DocumentActionComponent, DocumentActionProps } from "sanity"

const removesThePage = ["delete", "unpublish"]

function isHomepage({ draft, published }: DocumentActionProps) {
  return draft?.address === "/" || published?.address === "/"
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
