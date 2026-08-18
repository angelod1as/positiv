import type { NewsItem, NewsItemContent } from "./news"

// Helper function to get date relative to today
export function getDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

export function filterAndSortNews(
  items: NewsItem[],
  isAdmin: boolean,
): NewsItem[] {
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  return items
    .filter((item) => item.isActive)
    .filter((item) => item.createdAt > twoWeeksAgo)
    .filter((item) => !item.isAdmin || isAdmin)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// Export helper to check if user has visible news
export function hasVisibleNews(
  isAdmin: boolean,
  newsItems: NewsItem[],
): boolean {
  const filteredNews = filterAndSortNews(newsItems, isAdmin)
  return filteredNews.length > 0
}

const newsItemModules = import.meta.glob<{ default: NewsItemContent }>(
  "./items/*.ts",
  { eager: true },
)

export const DEFAULT_NEWS_ITEMS: NewsItem[] = Object.entries(
  newsItemModules,
).map(([path, module]) => ({
  ...module.default,
  id: path.replace(/^\.\/items\/|\.ts$/g, ""),
  isActive: true,
}))

export const NEWS_VERSION = Math.max(
  ...DEFAULT_NEWS_ITEMS.map((item) => item.createdAt.getTime()),
)
