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
  {
    id: '5',
    title: '🔐 Melhorias no sistema de autenticação',
    content: 'Melhoramos o sistema de autenticação para uma experiência mais estável. Agora, se você precisar fazer login novamente, o processo será mais suave e sem mensagens de erro desnecessárias.',
    isAdmin: false,
    createdAt: new Date('2025-07-29T19:30:00'), // July 29, 2025
    isActive: true,
  },
  {
    id: '4',
    title: '🏳️‍🌈 Atualização nas opções de orientação',
    content: 'A opção "Sapatão" foi alterada para "Lésbica" nas opções de orientação sexual. Isso reflete uma terminologia mais inclusiva e respeitosa. Se você já tinha selecionado a opção anterior, seus dados permanecem inalterados.',
    isAdmin: false,
    createdAt: new Date('2025-07-29T19:00:00'), // July 29, 2025
    isActive: true,
  },
  {
    id: '3',
    title: '📧 Migração de mailing concluída',
    content: 'A migração dos dados de mailing foi concluída com sucesso! Todos os perfis e participantes foram atualizados. O sistema está agora totalmente operacional com os novos dados.',
    isAdmin: false,
    createdAt: new Date('2025-07-29T00:00:00'), // July 29, 2025
    isActive: true,
  },
]