import { POSITIV_URL } from "~/lib/constants/constants"

export function loader() {
  const baseUrl = POSITIV_URL.replace(/\/$/, "")

  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`,
    {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400",
      },
    },
  )
}
