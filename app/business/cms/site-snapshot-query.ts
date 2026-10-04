import { pagesQuery } from "./pages-query"

const siteLinkProjection = `{ _key, label, "page": page->{ address }, url }`

export const siteSettingsQuery = `*[_id == "siteSettings"][0]{
  navigation[]${siteLinkProjection},
  footer{
    columns[]{ _key, title, links[]${siteLinkProjection} },
    social[]{ _key, network, url },
    text
  }
}`

export const siteSnapshotQuery = `{
  "pages": ${pagesQuery},
  "siteSettings": ${siteSettingsQuery}
}`
