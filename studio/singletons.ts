import type { DocumentActionComponent, TemplateItem } from "sanity"

export const HOMEPAGE_ID = "homepage"

export const SITE_SETTINGS_ID = "siteSettings"

const singletonTypes = ["homepage", "siteSettings"]

const actionsSingletonsKeep = ["publish", "discardChanges", "restore"]

export function singletonActions(
  actions: DocumentActionComponent[],
  { schemaType }: { schemaType: string },
) {
  return singletonTypes.includes(schemaType)
    ? actions.filter(
        ({ action }) => action && actionsSingletonsKeep.includes(action),
      )
    : actions
}

export function withoutSingletons(templates: TemplateItem[]) {
  return templates.filter(
    ({ templateId }) => !singletonTypes.includes(templateId),
  )
}
