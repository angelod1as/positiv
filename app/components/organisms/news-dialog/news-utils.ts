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
  {
    id: 'pos-217-email-testing-docs',
    title: '📚 Sistema de newsletters completo com testes e documentação!',
    content: 'O sistema de email marketing agora está totalmente testado e documentado! Foram criados testes automatizados para todas as funcionalidades, guias completos para administradores, documentação dos componentes MDX, e guia de resolução de problemas. O sistema está pronto para uso em produção com confiança!',
    isAdmin: true,
    createdAt: new Date('2025-08-19T12:00:00'), // August 19, 2025, 12PM
    isActive: true,
  },
  {
    id: 'pos-221-advanced-segmentation',
    title: '🚀 Segmentação avançada de audiência disponível!',
    content: 'A segmentação de newsletters foi aprimorada com filtros avançados! Agora você pode segmentar por: frequência de participação (quem participou X vezes), atividade recente (últimos 3 meses), usuários inativos (não participam há 6+ meses), usuários que abandonaram (eram ativos mas pararam), e filtros por datas específicas. Combine múltiplos filtros para criar audiências super específicas!',
    isAdmin: true,
    createdAt: new Date('2025-08-15T16:00:00'), // August 15, 2025, 4PM
    isActive: true,
  },
  {
    id: 'pos-216-segmentation',
    title: '🎯 Nova funcionalidade: Segmentação de audiência para newsletters',
    content: 'Agora você pode enviar newsletters para grupos específicos de participantes! Escolha entre veteranos, novatos, quem nunca participou, quem já participou, novos cadastros, e mais opções. Você também pode optar por incluir ou excluir participantes rejeitados.',
    isAdmin: true,
    createdAt: new Date('2025-08-15T14:00:00'), // August 15, 2025, 2PM
    isActive: true,
  },
  {
    id: '14',
    title: '🎨 Melhorias visuais na tabela de participantes',
    content: 'A tabela de participantes agora destaca visualmente identidades de gênero como Travesti e Pessoa não-binária (em azul), além de orientações como Sapiosexual (em vermelho), facilitando a visualização da diversidade do evento.',
    isAdmin: true,
    createdAt: new Date('2025-08-15T13:30:00'), // August 15, 2025, 1:30PM
    isActive: true,
  },
  {
    id: '13',
    title: '🚀 Envio imediato de newsletters disponível!',
    content: 'Agora você pode enviar newsletters imediatamente sem precisar agendar! Ao editar um rascunho de newsletter, clique no botão "Send Now" para enviar instantaneamente para todos os assinantes. O sistema mostrará o progresso e estatísticas do envio.',
    isAdmin: true,
    createdAt: new Date('2025-08-14T18:00:00'), // August 14, 2025, 6PM
    isActive: true,
  },
  {
    id: '12',
    title: '⏰ Newsletters agendadas são enviadas automaticamente!',
    content: 'Newsletters agendadas agora são processadas automaticamente a cada 5 minutos! Quando chegar o horário agendado, o sistema enviará automaticamente para todos os destinatários. Você também pode acionar o envio manualmente se necessário.',
    isAdmin: true,
    createdAt: new Date('2025-08-14T12:00:00'), // August 14, 2025
    isActive: true,
  },
  {
    id: '11',
    title: '✏️ Criar e editar newsletters agora disponível!',
    content: 'Administradores agora podem criar novas newsletters e editar rascunhos existentes! Use o editor MDX para formatar seu conteúdo com títulos, listas e muito mais. Agende envios para datas futuras ou salve como rascunho para continuar depois.',
    isAdmin: true,
    createdAt: new Date('2025-08-06T21:00:00'), // August 6, 2025, 9PM
    isActive: true,
  },
  {
    id: '10',
    title: '📬 Gerenciamento de Newsletters disponível!',
    content: 'Agora administradores podem visualizar todas as newsletters do sistema! Acesse o painel administrativo e clique em "Gerenciar Newsletters" para ver a lista completa com informações sobre status, destinatários e datas.',
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
  // Removed items older than 2 weeks as per guidelines
]