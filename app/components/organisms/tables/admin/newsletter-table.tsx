import { Link } from 'react-router'
import { format } from 'date-fns'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Card, CardContent } from '~/components/ui/card'
import { Eye, Pencil } from 'lucide-react'

type NewsletterStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'

interface Newsletter {
  id: string
  subject: string
  template_name: string
  content_mdx: string
  status: NewsletterStatus
  scheduled_at: string | null
  sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  recipient_count: number
  send_started_at?: string | null
  send_completed_at?: string | null
  total_recipients?: number | null
  successful_sends?: number | null
  failed_sends?: number | null
}

interface NewsletterTableProps {
  newsletters: Newsletter[]
}

const getStatusBadgeVariant = (status: NewsletterStatus) => {
  switch (status) {
    case 'draft':
      return 'secondary'
    case 'scheduled':
      return 'outline'  // Better visual distinction for scheduled
    case 'sending':
      return 'default'   // Active state
    case 'sent':
      return 'default'   // Completed state
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

const getDisplayDate = (newsletter: Newsletter) => {
  if (newsletter.sent_at) {
    return new Date(newsletter.sent_at)
  }
  if (newsletter.scheduled_at) {
    return new Date(newsletter.scheduled_at)
  }
  return new Date(newsletter.created_at)
}

export function NewsletterTable({ newsletters }: NewsletterTableProps) {
  if (newsletters.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No newsletters found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newsletters.map((newsletter) => (
              <TableRow key={newsletter.id}>
                <TableCell className="font-medium">
                  {newsletter.subject}
                </TableCell>
                <TableCell>
                  {formatTemplateName(newsletter.template_name)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(newsletter.status)}>
                    {newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {newsletter.recipient_count > 0 ? newsletter.recipient_count : '-'}
                </TableCell>
                <TableCell>
                  {format(getDisplayDate(newsletter), 'MMM d, yyyy h:mm a')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link to={`/admin/newsletters/${newsletter.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    {newsletter.status === 'draft' && (
                      <Link to={`/admin/newsletters/${newsletter.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}