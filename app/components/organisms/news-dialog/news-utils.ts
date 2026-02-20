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
export const NEWS_VERSION = 1771536000000

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "admin-event-count-default-sort",
    title: "📋 Tabela de participantes ordena por eventos automaticamente",
    content:
      "A coluna \"Total de eventos\" agora carrega com ordenação decrescente por padrão, mostrando as pessoas mais ativas primeiro. Participantes sem histórico de presença aparecem sempre no final da lista.",
    isAdmin: true,
    createdAt: new Date("2026-02-20T12:00:00"),
    isActive: true,
  },
  {
    id: "admin-last-attended-events-count",
    title: "📊 Nova coluna: Últimos eventos (6 últimos)",
    content:
      "Agora as tabelas de participantes e de perfis mostram quantos dos últimos 6 eventos realizados cada pessoa participou. Essa informação ajuda a identificar rapidamente quem está ativo na comunidade e quem não participa há algum tempo.",
    isAdmin: true,
    createdAt: new Date("2026-02-19T12:00:00"),
    isActive: true,
  },
]
