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
    id: '10',
    title: '📬 Gerenciamento de Newsletters disponível!',
    content: 'Agora administradores podem visualizar todas as newsletters do sistema! Acesse o painel administrativo e clique em "Gerenciar Newsletters" para ver a lista completa com informações sobre status, destinatários e datas. Em breve: criação e envio de newsletters!',
    isAdmin: true,
    createdAt: new Date('2025-08-06T18:00:00'), // August 6, 2025
    isActive: true,
  },
  {
    id: '9',
    title: '📧 Infraestrutura de email marketing criada',
    content: 'Foi criada a base do sistema de newsletters: tabelas no banco de dados e funções para gerenciar newsletters, envios e filas de processamento. Em breve você poderá criar e enviar newsletters para os participantes!',
    isAdmin: true,
    createdAt: new Date('2025-08-06T15:00:00'), // August 6, 2025
    isActive: true,
  },
  {
    id: '8',
    title: '🧪 Melhorias no sistema de testes automatizados',
    content: 'Implementamos um novo sistema de testes automatizados mais confiável e eficiente. Os testes agora simulam melhor o comportamento real dos usuários, garantindo uma experiência mais estável e menos bugs em produção.',
    isAdmin: true,
    createdAt: new Date('2025-08-05T14:00:00'), // August 5, 2025
    isActive: true,
  },
  {
    id: '7',
    title: '🛠️ Correção na edição de participantes (Admin)',
    content: 'Corrigimos um problema que impedia a edição de dados na tabela de participantes quando o participante tinha uma flag configurada. Agora você pode editar normalmente todos os campos.',
    isAdmin: true,
    createdAt: new Date('2025-08-04T12:00:00'), // August 4, 2025
    isActive: true,
  },
  {
    id: '6',
    title: '📱 Adicione participantes aos seus Google Contacts!',
    content: 'Agora você pode adicionar participantes aos seus Google Contacts com um clique! O nome formatado é copiado automaticamente para você colar no Google Contacts.',
    isAdmin: true,
    createdAt: new Date('2025-07-30T12:00:00'), // July 30, 2025
    isActive: true,
  },
]