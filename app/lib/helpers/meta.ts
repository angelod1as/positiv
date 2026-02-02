const APP_NAME = "Positiv Party"

export function createPageTitle(title: string): string {
  const trimmedTitle = title.trim()
  return trimmedTitle === APP_NAME
    ? APP_NAME
    : `${trimmedTitle} | ${APP_NAME}`
}

export function createMetaArray(title: string) {
  const pageTitle = createPageTitle(title)
  return [
    { title: pageTitle },
    { property: "og:title", content: pageTitle },
  ]
}
