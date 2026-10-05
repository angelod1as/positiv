import type { PagesSnapshot } from "~/business/cms/pages-snapshot.server"
import { siteSnapshotCache } from "~/business/cms/site-snapshot-cache.server"
import { POSITIV_URL } from "~/lib/constants/constants"
import { logger } from "~/lib/logger/logger.server"

const PLATFORM_ADDRESSES = ["/codigo-de-conduta", "/feedback"]

export async function loader() {
  const baseUrl = POSITIV_URL.replace(/\/$/, "")

  let pages: PagesSnapshot
  try {
    pages = (await siteSnapshotCache.get()).pages
  } catch (error) {
    logger.error("Could not load the Pages, so there is no sitemap", {
      error: error instanceof Error ? error.message : String(error),
    })
    return new Response(null, { status: 503 })
  }

  const urls: { loc: string; lastmod?: string }[] = [
    ...[...pages.values()]
      .filter(({ seo }) => !seo.noIndex)
      .sort((a, b) => (a.address < b.address ? -1 : 1))
      .map(({ address, _updatedAt }) => ({
        loc: `${baseUrl}${address}`,
        lastmod: _updatedAt,
      })),
    ...PLATFORM_ADDRESSES.map((address) => ({ loc: `${baseUrl}${address}` })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ loc, lastmod }) => `  <url>
    <loc>${loc}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
