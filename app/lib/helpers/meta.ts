export function createPageTitle(title: string): string {
  return title === "Positiv Party" ? title : `${title} | Positiv Party`
}

export function createMetaArray(title: string) {
  return [
    { title: createPageTitle(title) },
    { property: "og:title", content: createPageTitle(title) },
  ]
}
