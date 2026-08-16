import type { NewsItem } from "./news"

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

// NEWS_VERSION is a timestamp that triggers the news dialog when updated
// Update this to Date.now() whenever adding new news items
export const NEWS_VERSION = 1786921377045

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "rodizio-resets-last-events-count",
    title: "🔄 Rodízio zera a conta dos últimos 6 eventos",
    content:
      "Quando uma pessoa entra no rodízio e não vai ao evento (status \"Pulade (rodízio)\"), a coluna \"Últimos eventos (6 últimos)\" zera e a contagem recomeça a partir dali. Assim quem foi rodiziade aparece na frente na hora de escolher quem entra no próximo evento. A conta só zera depois que o evento do rodízio é marcado como realizado, e o \"Total de eventos\" continua contando o histórico completo.",
    isAdmin: true,
    createdAt: new Date("2026-08-16T12:00:00"),
    isActive: true,
  },
]
