import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Copy } from "~/components/atoms/copy/copy"
import { newsDialogCopy } from "~/copy/layout"
import { DEFAULT_NEWS_ITEMS, filterAndSortNews } from "./news-utils"

export interface NewsItemContent {
  title: string
  content: string
  isAdmin: boolean
  createdAt: Date
}

export interface NewsItem extends NewsItemContent {
  id: string
  isActive: boolean
}

interface NewsProps {
  newsItems?: NewsItem[]
  isAdmin?: boolean
}

export const News = ({
  newsItems = DEFAULT_NEWS_ITEMS,
  isAdmin = false,
}: NewsProps) => {
  const filteredNews = filterAndSortNews(newsItems, isAdmin)

  if (filteredNews.length === 0) {
    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        <h3 className="sticky top-0 bg-background pb-2">
          {newsDialogCopy.heading}
        </h3>
        <div className="space-y-2">
          <h4>{newsDialogCopy.empty.title}</h4>
          <Copy>{newsDialogCopy.empty.body}</Copy>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <h3 className="sticky top-0 bg-background pb-2">
        {newsDialogCopy.heading}
      </h3>
      <div className="space-y-4">
        {filteredNews.map((item) => (
          <div key={item.id} className="space-y-2 pb-2 border-b last:border-0">
            <h4>{item.title}</h4>
            <p>{item.content}</p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(item.createdAt, {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
