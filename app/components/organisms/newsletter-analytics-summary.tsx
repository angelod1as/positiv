import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import type { NewsletterAnalytics } from '~/business/admin/newsletter/newsletter-analytics.server'

interface NewsletterAnalyticsSummaryProps {
  analytics: NewsletterAnalytics | null
  isLoading?: boolean
  error?: string
}

export function NewsletterAnalyticsSummary({ 
  analytics, 
  isLoading, 
  error 
}: NewsletterAnalyticsSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading analytics...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
          <span className="text-red-500">{error}</span>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const showPerformanceMetrics = analytics.sendDuration > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Recipients</p>
            <p className="text-2xl font-bold">{formatNumber(analytics.totalRecipients)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Delivered</p>
            <p className="text-2xl font-bold">
              {formatNumber(analytics.successfulSends)} ({analytics.deliveryRate}%)
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold">{formatNumber(analytics.failedSends)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unsubscribes</p>
            <p className="text-2xl font-bold">{formatNumber(analytics.unsubscribes)}</p>
          </div>
        </div>

        {showPerformanceMetrics && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3">Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Send Duration</p>
                <p className="text-lg font-medium">{analytics.sendDuration} minutes</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Send Time</p>
                <p className="text-lg font-medium">{analytics.averageSendTime} seconds/email</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}