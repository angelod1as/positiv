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

/**
 * News items live one per file under `items/` and are collected at build time
 * by `import.meta.glob`. This file is deliberately free of news content: it
 * used to hold the whole list plus a hand-bumped version, which made every
 * branch conflict with every other branch.
 *
 * To announce something, add `items/<YYYY-MM-DD>-<slug>.ts` — never edit this
 * file, and never touch an item another branch may also be touching.
 *
 * - `id` is the file name without `.ts`, so git guarantees ids stay unique
 * - `isActive` is implied by the file existing; retire an item by deleting it
 * - `NEWS_VERSION` is the newest `createdAt`; adding an item re-opens the
 *   dialog for everyone on its own, so there is no version to bump
 */
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
