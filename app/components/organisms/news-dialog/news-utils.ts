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
    id: 'fix-newsletter-edit-schedule',
    title: '✏️ Edição de newsletters agendadas agora disponível!',
    content: 'Correção importante: agora você pode editar newsletters que já foram agendadas! Além disso, adicionamos um botão "Cancelar Agendamento" para voltar a newsletter para rascunho se você precisar fazer mudanças maiores. Newsletters enviadas continuam não podendo ser editadas para manter a integridade do histórico.',
    isAdmin: true,
    createdAt: new Date('2025-09-16T17:45:00'), // September 16, 2025, 5:45PM
    isActive: true,
  },
  {
    id: 'pos-231-demographics-fix',
    title: '🔧 Correção no cálculo de demografia de eventos!',
    content: 'Corrigimos um problema onde a demografia do evento poderia mostrar dados incorretos (como 100% veteranes) ao marcar o evento como concluído. Agora o cálculo é feito de forma confiável antes de atualizar o status, garantindo que os dados demográficos sejam sempre precisos.',
    isAdmin: true,
    createdAt: new Date('2025-09-08T22:15:00'), // September 8, 2025, 10:15PM
    isActive: true,
  },
  {
    id: 'pos-232-events-filter',
    title: '🎯 Filtro de status na tabela de eventos!',
    content: 'A tabela de eventos agora mostra apenas eventos ativos por padrão (excluindo eventos cancelados e concluídos). Você pode personalizar quais status de eventos deseja visualizar usando o novo filtro multi-seleção na coluna "Status". Suas preferências são salvas automaticamente para a próxima vez que acessar a página!',
    isAdmin: true,
    createdAt: new Date('2025-09-07T15:30:00'), // September 7, 2025, 3:30PM
    isActive: true,
  },
  {
    id: 'fix-mdx-newsletter-delete',
    title: '🗑️ Exclusão de newsletters rascunho agora disponível!',
    content: 'Agora você pode excluir newsletters que estão em rascunho ou agendadas diretamente da lista de newsletters! Basta clicar no ícone de lixeira ao lado do botão de edição. Newsletters já enviadas não podem ser excluídas para manter o histórico.',
    isAdmin: true,
    createdAt: new Date('2025-09-04T16:00:00'), // September 4, 2025, 4PM
    isActive: true,
  },
  {
    id: 'fix-mdx-newsletter-errors',
    title: '🔍 Mensagens de erro mais claras no editor de newsletters!',
    content: 'Melhoramos as mensagens de erro do editor MDX de newsletters! Agora quando houver um erro no conteúdo, você verá exatamente qual é o problema, em qual linha está ocorrendo, e sugestões de como corrigir. Erros de sintaxe, componentes desconhecidos e expressões JavaScript bloqueadas agora são reportados com detalhes úteis.',
    isAdmin: true,
    createdAt: new Date('2025-09-04T15:30:00'), // September 4, 2025, 3:30PM
    isActive: true,
  },
  {
    id: 'pos-229-newsletter-metadata',
    title: '📊 Informações detalhadas sobre o envio de newsletters!',
    content: 'Agora você pode ver todas as informações sobre newsletters enviadas! Ao visualizar uma newsletter que foi enviada, você verá: o segmento selecionado, quantas pessoas receberam, quando foi enviada e quem enviou. Essas informações ficam preservadas para histórico e não podem ser alteradas depois do envio.',
    isAdmin: true,
    createdAt: new Date('2025-09-04T14:00:00'), // September 4, 2025, 2PM
    isActive: true,
  },
  // Items older than 2 weeks (before September 2, 2025) were removed as per guidelines
]