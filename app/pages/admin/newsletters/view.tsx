import { Link, useLoaderData, useFetcher } from 'react-router'
import { redirectWithToast } from 'remix-toast'
import { getAdminContext } from '~/business/admin/admin.server'
import { getNewsletterById } from '~/business/admin/newsletter/newsletter.server'
import { processScheduledNewsletters } from '~/business/admin/newsletter/newsletter-scheduler.server'
import { db } from '~/lib/supabase/db.server'
import { withErrorRedirect } from '~/lib/helpers/error-handling'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { ArrowLeft, Edit, Clock, Calendar, Send, Loader2, AlertCircle } from 'lucide-react'
import { format, isPast } from 'date-fns'
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

export async function action({ request, params }: Route.ActionArgs) {
  await getAdminContext(request, params)
  
  const formData = await request.formData()
  const intent = formData.get('intent')
  
  if (intent === 'trigger-processing') {
    // Process newsletters directly on the server without API call
    return withErrorRedirect(
      () => processScheduledNewsletters(db, {
        maxExecutionTime: 140000, // 140 seconds (leaving buffer for edge function's 150s limit)
      }),
      {
        redirectPath: `/admin/newsletters/${params.id}`,
        successMessage: (result) => `Processing triggered: ${result.totalProcessed} sent, ${result.totalFailed} failed`,
        errorMessage: "Error triggering processing",
      }
    )
  }
  
  return { success: false }
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
  const fetcher = useFetcher()
  const isProcessing = fetcher.state === 'submitting'
  
  const isScheduledAndReady = newsletter.status === 'scheduled' && 
    newsletter.scheduled_at && 
    isPast(new Date(newsletter.scheduled_at))
  
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
        
        <div className="flex gap-2">
          {newsletter.status === 'draft' && (
            <Link to={`/admin/newsletters/${newsletter.id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Newsletter
              </Button>
            </Link>
          )}
          
          {(newsletter.status === 'scheduled' || newsletter.status === 'sending') && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="trigger-processing" />
              <Button type="submit" variant="outline" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Trigger Processing
                  </>
                )}
              </Button>
            </fetcher.Form>
          )}
        </div>
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
          
          {newsletter.status === 'scheduled' && (
            <div className="pt-4 border-t">
              {isScheduledAndReady ? (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ready for Processing</p>
                    <p className="text-sm text-muted-foreground">
                      This newsletter is scheduled and ready to be sent. It will be processed automatically 
                      within the next 5 minutes, or you can trigger processing manually using the button above.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This newsletter is scheduled to be sent on {newsletter.scheduled_at && format(new Date(newsletter.scheduled_at), 'MMM d, yyyy h:mm a')}.
                  It will be processed automatically when the scheduled time arrives.
                </p>
              )}
            </div>
          )}
          
          {newsletter.status === 'sending' && (
            <div className="pt-4 border-t">
              <div className="flex items-start gap-2">
                <Loader2 className="h-4 w-4 text-blue-500 mt-0.5 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Currently Sending</p>
                  <p className="text-sm text-muted-foreground">
                    This newsletter is currently being processed and sent to recipients.
                    The status will update to "Sent" once all emails have been delivered.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {newsletter.status === 'sent' && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                This newsletter was successfully sent on {newsletter.sent_at && format(new Date(newsletter.sent_at), 'MMM d, yyyy h:mm a')}.
              </p>
            </div>
          )}
          
          {newsletter.status === 'failed' && (
            <div className="pt-4 border-t">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-500">Sending Failed</p>
                  <p className="text-sm text-muted-foreground">
                    There was an error sending this newsletter. Please check the logs for more information
                    or try triggering the processing again.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}