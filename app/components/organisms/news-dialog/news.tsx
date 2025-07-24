import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface NewsItem {
  id: string
  title: string
  content: string
  isAdmin: boolean
  createdAt: Date
  isActive: boolean
}

interface NewsProps {
  newsItems?: NewsItem[]
  isAdmin?: boolean
}

const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: '1',
    title: 'Nova funcionalidade de exportação',
    content: 'Agora você pode exportar relatórios de participantes em formato Excel clicando no botão "Exportar" na página do evento.',
    isAdmin: false,
    createdAt: new Date('2025-01-22'),
    isActive: true,
  },
  {
    id: '2',
    title: 'Melhorias no sistema de inscrições',
    content: 'O formulário de inscrição agora salva automaticamente seu progresso. Se você sair da página, pode continuar de onde parou!',
    isAdmin: false,
    createdAt: new Date('2025-01-20'),
    isActive: true,
  },
  {
    id: '3',
    title: 'Novo dashboard de métricas',
    content: 'Administradores agora têm acesso a um novo dashboard com métricas detalhadas sobre eventos, participantes e tendências de inscrição.',
    isAdmin: true,
    createdAt: new Date('2025-01-19'),
    isActive: true,
  },
  {
    id: '4',
    title: 'Sistema de notificações melhorado',
    content: 'Correções no envio de e-mails garantem que você receba todas as notificações importantes sobre seus eventos.',
    isAdmin: false,
    createdAt: new Date('2025-01-15'),
    isActive: true,
  },
  {
    id: '5',
    title: 'Ferramenta de moderação de inscrições',
    content: 'Nova interface para aprovar ou rejeitar inscrições em lote, com filtros avançados e busca por nome ou e-mail.',
    isAdmin: true,
    createdAt: new Date('2025-01-10'),
    isActive: true,
  },
]

function filterAndSortNews(items: NewsItem[], isAdmin: boolean): NewsItem[] {
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  
  return items
    .filter(item => item.isActive)
    .filter(item => item.createdAt > twoWeeksAgo)
    .filter(item => !item.isAdmin || isAdmin)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const News = ({ newsItems = DEFAULT_NEWS_ITEMS, isAdmin = false }: NewsProps) => {
  const filteredNews = filterAndSortNews(newsItems, isAdmin)
  
  if (filteredNews.length === 0) {
    return (
      <div className="space-y-4 [&>div]:space-y-2">
        <h3>O que há de novo</h3>
        <div>
          <h4>Olha! Um aviso!</h4>
          <p>
            Através dele você poderá saber sobre as atualizações, resoluções de
            bugs, e novidades do nosso site.
          </p>
          <p>
            Ele só aparece quando você está logade <b>nunca mais</b> enche o saco
            se você clicar no botão abaixo.
          </p>
          <blockquote>"Ah, mas eu quero ler de novo"</blockquote>
          <p>Simples, é só clicar no link lá no pé da página.</p>
          <p>
            Assim que a houver uma nova atualização, ele voltará a pular na sua
            frente — assim você poderá saber todas as nossas novidades!
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <h3>O que há de novo</h3>
      {filteredNews.map((item) => (
        <div key={item.id} className="space-y-2">
          <h4>{item.title}</h4>
          <p>{item.content}</p>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(item.createdAt, { 
              addSuffix: true,
              locale: ptBR 
            })}
          </p>
        </div>
      ))}
    </div>
  )
}
