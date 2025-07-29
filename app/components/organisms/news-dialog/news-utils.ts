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
    title: '📧 Migração de mailing concluída',
    content: 'A migração dos dados de mailing foi concluída com sucesso! Todos os perfis e participantes foram atualizados. O sistema está agora totalmente operacional com os novos dados.',
    isAdmin: false,
    createdAt: new Date('2025-07-29T00:00:00'), // July 29, 2025
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