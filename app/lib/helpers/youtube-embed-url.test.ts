import { describe, expect, it } from "vitest"
import { youtubeEmbedUrl } from "./youtube-embed-url"

const EMBED = "https://www.youtube.com/embed/WIveBynr7Yc"

describe("youtubeEmbedUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=WIveBynr7Yc",
    "https://youtube.com/watch?v=WIveBynr7Yc",
    "https://m.youtube.com/watch?v=WIveBynr7Yc",
    "https://www.youtube.com/watch?v=WIveBynr7Yc&t=42s",
    "https://www.youtube.com/watch?feature=share&v=WIveBynr7Yc",
    "https://youtu.be/WIveBynr7Yc",
    "https://youtu.be/WIveBynr7Yc?si=2T_SBw3EwHerW-tf",
    "https://www.youtube.com/embed/WIveBynr7Yc",
    "https://www.youtube.com/embed/WIveBynr7Yc?si=2T_SBw3EwHerW-tf",
  ])("turns %s into the embed URL", (url) => {
    expect(youtubeEmbedUrl(url)).toBe(EMBED)
  })

  it.each([
    "https://vimeo.com/123456",
    "https://www.youtube.com/@positivparty",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=not a valid id",
    "https://youtu.be/",
    "https://evil.example/youtu.be/WIveBynr7Yc",
    "https://notyoutube.com/watch?v=WIveBynr7Yc",
    "not a url",
  ])("returns null for %s", (url) => {
    expect(youtubeEmbedUrl(url)).toBeNull()
  })
})
