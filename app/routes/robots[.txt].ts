export function loader() {
  return new Response("User-agent: *\nAllow: /\nDisallow: /admin\n", {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
