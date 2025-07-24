import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DEFAULT_NEWS_ITEMS, filterAndSortNews } from './news-utils'

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

export const News = ({ newsItems = DEFAULT_NEWS_ITEMS, isAdmin = false }: NewsProps) => {
  const filteredNews = filterAndSortNews(newsItems, isAdmin)
  
  if (filteredNews.length === 0) {
    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        <h3 className="sticky top-0 bg-background pb-2">O que há de novo</h3>
        <div className="space-y-2">
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
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <h3 className="sticky top-0 bg-background pb-2">O que há de novo</h3>
      <div className="space-y-4">
        {filteredNews.map((item) => (
          <div key={item.id} className="space-y-2 pb-2 border-b last:border-0">
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
    </div>
  )
}
