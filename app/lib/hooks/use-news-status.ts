import { useEffect, useState } from "react"
import { NEWS_VERSION } from "~/components/organisms/news-dialog/news-utils"

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null

  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split("=")
    if (cookieName === name) {
      return cookieValue
    }
  }
  return null
}

export function useNewsStatus(): boolean {
  const [shouldShowNews, setShouldShowNews] = useState(true)

  useEffect(() => {
    const newsVersion = getCookieValue("newsVersion")
    const showNews = getCookieValue("showNews")

    // Parse the news version from cookie (default to 0 if invalid or missing)
    const oldNewsVersion = newsVersion ? Number(newsVersion) : 0

    // Determine if news should be shown
    // Show news if:
    // 1. The stored version is older than current NEWS_VERSION
    // 2. OR showNews is not explicitly "false"
    const shouldShow =
      oldNewsVersion < Number(NEWS_VERSION) || showNews !== "false"

    setShouldShowNews(shouldShow)
  }, [])

  return shouldShowNews
}
