import { format } from "date-fns"
import { Eye, Pencil } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"

type NewsletterStatus = "draft" | "scheduled" | "sending" | "sent" | "failed"

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
    case "draft":
      return "secondary"
    case "scheduled":
      return "outline"
    case "sending":
      return "default"
    case "sent":
      return "default"
    case "failed":
      return "destructive"
    default:
      return "secondary"
  }
}

const formatStatusText = (status: NewsletterStatus): string => {
  switch (status) {
    case "draft":
      return "Rascunho"
    case "scheduled":
      return "Agendada"
    case "sending":
      return "Enviando"
    case "sent":
      return "Enviada"
    case "failed":
      return "Falhou"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

const formatTemplateName = (template: string) => {
  switch (template) {
    case "general-news":
      return "Notícias Gerais"
    case "event-announcement":
      return "Anúncio de Evento"
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
          <p className="text-center text-muted-foreground">
            Nenhuma newsletter encontrada
          </p>
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
              <TableHead>Assunto</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Destinatários</TableHead>
              <TableHead>Data</TableHead>
              <TableHead />
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
                    {formatStatusText(newsletter.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {newsletter.recipient_count > 0
                    ? newsletter.recipient_count
                    : "-"}
                </TableCell>
                <TableCell>
                  {format(getDisplayDate(newsletter), "MMM d, yyyy h:mm a")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link to={`/admin/newsletters/${newsletter.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                      </Button>
                    </Link>
                    {newsletter.status === "draft" && (
                      <Link to={`/admin/newsletters/${newsletter.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4 mr-1" />
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
