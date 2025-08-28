import { Link, useLoaderData } from 'react-router'
import { getAllNewslettersWithCounts } from '~/business/admin/newsletter/newsletter.server'
import { NewsletterTable } from '~/components/organisms/tables/admin/newsletter-table'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Mail, Send, FileText } from 'lucide-react'
import type { Route } from './+types/index'
import { getAdminContext } from '~/business/admin/admin.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
  
  const newsletters = await getAllNewslettersWithCounts()
  
  return { newsletters }
}

export default function NewslettersPage() {
  const { newsletters } = useLoaderData<typeof loader>()
  
  const totalNewsletters = newsletters.length
  const sentNewsletters = newsletters.filter(n => n.status === 'sent').length
  const totalRecipients = newsletters.reduce((sum, n) => sum + n.recipient_count, 0)
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Newsletters</h1>
        <Link to="/admin/newsletters/new">
          <Button>
            <Mail className="mr-2 h-4 w-4" />
            Criar Newsletter
          </Button>
        </Link>
      </div>
      
      {newsletters.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Newsletters</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNewsletters}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sentNewsletters}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Destinatários</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecipients}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {newsletters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma newsletter encontrada</h2>
            <p className="text-muted-foreground mb-4">Crie sua primeira newsletter para começar a engajar com sua comunidade</p>
            <Link to="/admin/newsletters/new">
              <Button>Criar Newsletter</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <NewsletterTable newsletters={newsletters} />
      )}
    </div>
  )
}