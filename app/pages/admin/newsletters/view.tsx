import { Link, useLoaderData } from 'react-router'
import { redirectWithToast } from 'remix-toast'
import { getAdminContext } from '~/business/admin/admin.server'
import { getNewsletterById } from '~/business/admin/newsletter/newsletter.server'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { ArrowLeft, Edit, Clock, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import paths from '~/lib/paths'
import type { Route } from './+types/view'

const {
  admin: {
    newsletters: { ADMIN_NEWSLETTERS },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
  
  const newsletterId = params.id
  if (!newsletterId) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "Newsletter ID is required", type: "error" }
    )
  }
  
  const newsletter = await getNewsletterById(newsletterId)
  
  if (!newsletter) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "Newsletter not found", type: "error" }
    )
  }
  
  return { newsletter }
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'secondary'
    case 'scheduled':
      return 'outline'
    case 'sending':
      return 'default'
    case 'sent':
      return 'default'
    case 'failed':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const formatTemplateName = (template: string) => {
  switch (template) {
    case 'general-news':
      return 'General News'
    case 'event-announcement':
      return 'Event Announcement'
    default:
      return template
  }
}

export default function AdminViewNewsletterPage() {
  const { newsletter } = useLoaderData<typeof loader>()
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={ADMIN_NEWSLETTERS()}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Newsletters
            </Button>
          </Link>
        </div>
        
        {newsletter.status === 'draft' && (
          <Link to={`/admin/newsletters/${newsletter.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Newsletter
            </Button>
          </Link>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{newsletter.subject}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant={getStatusBadgeVariant(newsletter.status)}>
                  {newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                </Badge>
                <span className="flex items-center gap-1">
                  Template: {formatTemplateName(newsletter.template_name)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Created: {format(new Date(newsletter.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
            
            {newsletter.scheduled_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Scheduled: {format(new Date(newsletter.scheduled_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
            
            {newsletter.sent_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Sent: {format(new Date(newsletter.sent_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Content (MDX)</h3>
            <Card>
              <CardContent className="pt-6">
                <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-md overflow-x-auto">
                  {newsletter.content_mdx}
                </pre>
              </CardContent>
            </Card>
          </div>
          
          {newsletter.status === 'draft' && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                This newsletter is in draft mode. You can edit it or schedule it for sending.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}