const VIDEO_ID = /^[\w-]{11}$/
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"])

function videoId(url: URL): string | null {
  if (url.hostname === "youtu.be") {
    return url.pathname.slice(1)
  }
  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return null
  }
  if (url.pathname === "/watch") {
    return url.searchParams.get("v")
  }
  const [, section, id] = url.pathname.split("/")
  return section === "embed" ? (id ?? null) : null
}

export const youtubeEmbedUrl = (link: string): string | null => {
  if (!URL.canParse(link)) {
    return null
  }
  const id = videoId(new URL(link))
  return id && VIDEO_ID.test(id) ? `https://www.youtube.com/embed/${id}` : null
}
