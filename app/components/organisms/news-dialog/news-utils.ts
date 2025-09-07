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
  {
    id: 'pos-230-event-scheduling',
    title: '📅 Publicação automática de eventos disponível!',
    content: 'Os eventos agora podem ser publicados automaticamente! Ao criar ou editar um evento, você pode marcar a opção "Publicar automaticamente" para que o evento seja liberado para inscrições na data e hora configuradas. Não precisa mais ficar lembrando de abrir as inscrições manualmente!',
    isAdmin: true,
    createdAt: new Date('2025-09-02T11:00:00'), // September 2, 2025, 11AM
    isActive: true,
  },
  {
    id: 'pos-226-mdx-components-docs',
    title: '📝 Documentação de componentes MDX para newsletters!',
    content: 'Ao criar ou editar uma newsletter, agora você tem um botão "Componentes MDX" que abre um painel lateral com todos os componentes disponíveis para usar no conteúdo. Veja pré-visualizações ao vivo, copie códigos prontos e consulte a documentação completa de cada componente sem sair da tela de edição!',
    isAdmin: true,
    createdAt: new Date('2025-09-02T10:00:00'), // September 2, 2025, 10AM
    isActive: true,
  },
  {
    id: 'pos-225-segment-descriptions',
    title: '📊 Tabela de descrições de segmentos disponível!',
    content: 'Ao criar uma nova newsletter, agora você verá uma tabela explicativa com todos os segmentos disponíveis, suas descrições e a quantidade de pessoas em cada um. Os números são atualizados diariamente automaticamente. Isso facilita a escolha do público-alvo correto para suas newsletters!',
    isAdmin: true,
    createdAt: new Date('2025-09-01T17:00:00'), // September 1, 2025, 5PM
    isActive: true,
  },
  // Items older than 2 weeks (before August 21, 2025) were removed as per guidelines
]