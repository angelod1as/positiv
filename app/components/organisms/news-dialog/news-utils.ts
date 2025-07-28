import type { NewsItem } from './news'

// Helper function to get date relative to today
export function getDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

export function filterAndSortNews(items: NewsItem[], isAdmin: boolean): NewsItem[] {
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  
  return items
    .filter(item => item.isActive)
    .filter(item => item.createdAt > twoWeeksAgo)
    .filter(item => !item.isAdmin || isAdmin)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// Export helper to check if user has visible news
export function hasVisibleNews(isAdmin: boolean, newsItems: NewsItem[]): boolean {
  const filteredNews = filterAndSortNews(newsItems, isAdmin)
  return filteredNews.length > 0
}

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: '3',
    title: '🔄 Ferramenta de sincronização de banco de dados (Admin)',
    content: 'Nova ferramenta para copiar dados de produção para ambiente local de desenvolvimento. Use "pnpm db:sync:prod:dry-run" para visualizar o que será feito ou "pnpm db:sync:prod" para executar a sincronização completa. Útil para testar migrações com dados reais.',
    isAdmin: true,
    createdAt: new Date('2025-07-28T00:00:00'), // July 28, 2025
    isActive: true,
  },
  {
    id: '2',
    title: '🚩 Sistema de flags para participantes (Admin)',
    content: 'Agora é possível adicionar flags (amarela ou vermelha) aos participantes em cada evento específico, com notas explicativas. As flags aparecem nas tabelas de participantes com indicadores visuais e tooltips mostrando as notas ao passar o mouse.',
    isAdmin: true,
    createdAt: new Date('2025-07-26T00:00:00'), // July 26, 2025
    isActive: true,
  },
]