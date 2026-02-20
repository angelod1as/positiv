export function loader() {
  return new Response("User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://positivparty.com/sitemap.xml\n", {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
