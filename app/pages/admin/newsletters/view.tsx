import { Link, useLoaderData, useFetcher } from 'react-router'
import { redirectWithToast, redirectWithSuccess } from 'remix-toast'
import { useState } from 'react'
import { getAdminContext } from '~/business/admin/admin.server'
import { sendNewsletterNow } from '~/business/admin/newsletter/newsletter.server'
import { processScheduledNewsletters } from '~/business/admin/newsletter/newsletter-scheduler.server'
import { deleteNewsletter } from '~/business/admin/newsletter/delete-newsletter.server'
import { getNewsletterWithMetadata, formatSegmentDescription, formatSenderName } from '~/business/admin/newsletter/newsletter-metadata.server'
import { db } from '~/lib/supabase/db.server'
import { withErrorRedirect } from '~/lib/helpers/error-handling'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { ArrowLeft, Edit, Clock, Calendar, Send, Loader2, AlertCircle, Trash2, Eye, Users, User } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import paths from '~/lib/paths'
import ConfirmDialog from '~/components/molecules/confirm-dialog/confirm-dialog'
import { NewsletterPreviewModal } from '~/components/organisms/newsletter/newsletter-preview-modal'
import type { Route } from './+types/view'

const {
  admin: {
    newsletters: { ADMIN_NEWSLETTERS, ADMIN_VIEW_NEWSLETTER },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
  
  const newsletterId = params.id
  if (!newsletterId) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "ID da newsletter é obrigatório", type: "error" }
    )
  }
  
  const newsletter = await getNewsletterWithMetadata(newsletterId)
  
  if (!newsletter) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "Newsletter não encontrada", type: "error" }
    )
  }
  
  // Format metadata on the server side
  const formattedSegment = formatSegmentDescription(newsletter.segment_filter, newsletter.exclude_rejected)
  const formattedSender = formatSenderName(newsletter.creator_name, newsletter.creator_email)
  
  return { 
    newsletter,
    formattedSegment,
    formattedSender
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  await getAdminContext(request, params)
  
  const formData = await request.formData()
  const intent = formData.get('intent')
  const newsletterId = params.id
  
  if (!newsletterId) {
    throw await redirectWithToast(
      ADMIN_NEWSLETTERS(),
      { message: "ID da newsletter é obrigatório", type: "error" }
    )
  }
  
  if (intent === 'delete') {
    return withErrorRedirect(
      () => deleteNewsletter(newsletterId),
      {
        redirectPath: ADMIN_NEWSLETTERS(),
        successMessage: "Newsletter excluída com sucesso",
        errorMessage: "Erro ao excluir newsletter",
      }
    )
  }
  
  if (intent === 'send-now') {
    try {
      const result = await sendNewsletterNow(newsletterId)
      throw await redirectWithSuccess(
        ADMIN_VIEW_NEWSLETTER(newsletterId),
        `Newsletter enviada com sucesso! ${result.processed} emails enviados.`
      )
    } catch (error) {
      if (error instanceof Response) throw error
      throw await redirectWithToast(
        ADMIN_VIEW_NEWSLETTER(newsletterId),
        { 
          message: error instanceof Error ? error.message : "Falha ao enviar newsletter", 
          type: "error" 
        }
      )
    }
  }
  
  if (intent === 'trigger-processing') {
    // Process newsletters directly on the server without API call
    return withErrorRedirect(
      () => processScheduledNewsletters(db, {
        maxExecutionTime: 140000, // 140 seconds (leaving buffer for edge function's 150s limit)
      }),
      {
        redirectPath: `/admin/newsletters/${params.id}`,
        successMessage: (result) => `Processamento iniciado: ${result.totalProcessed} enviadas, ${result.totalFailed} falharam`,
        errorMessage: "Erro ao iniciar processamento",
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
      return 'Notícias Gerais'
    case 'event-announcement':
      return 'Anúncio de Evento'
    default:
      return template
  }
}

const formatStatusText = (status: string) => {
  switch (status) {
    case 'draft':
      return 'Rascunho'
    case 'scheduled':
      return 'Agendada'
    case 'sending':
      return 'Enviando'
    case 'sent':
      return 'Enviada'
    case 'failed':
      return 'Falhou'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

export default function AdminViewNewsletterPage() {
  const { newsletter, formattedSegment, formattedSender } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sendNowDialogOpen, setSendNowDialogOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const isProcessing = fetcher.state === 'submitting'
  const isDeleting = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'delete'
  const isSending = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'send-now'
  
  const isScheduledAndReady = newsletter.status === 'scheduled' && 
    newsletter.scheduled_at && 
    isPast(new Date(newsletter.scheduled_at))
  
  const handleDeleteConfirm = (closeDialog: () => void) => {
    fetcher.submit(
      { intent: 'delete' },
      { method: 'post' }
    )
    closeDialog()
  }
  
  const handleSendNowConfirm = (closeDialog: () => void) => {
    fetcher.submit(
      { intent: 'send-now' },
      { method: 'post' }
    )
    closeDialog()
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={ADMIN_NEWSLETTERS()}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Newsletters
            </Button>
          </Link>
        </div>
        
        <div className="flex gap-2">
          {/* Preview button for all newsletters with content */}
          {newsletter.content_mdx && (
            <Button
              variant="outline"
              onClick={() => setPreviewModalOpen(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Email
            </Button>
          )}
          
          {(newsletter.status === 'draft' || newsletter.status === 'scheduled') && (
            <>
              <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Excluir Newsletter"
                description="Tem certeza que deseja excluir esta newsletter? Esta ação não pode ser desfeita."
                confirmLabel="Sim, excluir"
                cancelLabel="Cancelar"
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
              >
                <ConfirmDialog.Trigger
                  variant="destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </ConfirmDialog.Trigger>
              </ConfirmDialog>
            </>
          )}
          
          {(newsletter.status === 'draft' || newsletter.status === 'scheduled') && (
            <Link to={`/admin/newsletters/${newsletter.id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Editar Newsletter
              </Button>
            </Link>
          )}

          {newsletter.status === 'draft' && (
            <ConfirmDialog
              open={sendNowDialogOpen}
              onOpenChange={setSendNowDialogOpen}
              title="Enviar Newsletter Agora"
              description="Tem certeza que deseja enviar esta newsletter imediatamente para todos os inscritos?"
              confirmLabel="Sim, enviar agora"
              cancelLabel="Cancelar"
              onConfirm={handleSendNowConfirm}
              isLoading={isSending}
            >
              <ConfirmDialog.Trigger
                variant="default"
                disabled={isSending}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? 'Enviando...' : 'Enviar Agora'}
              </ConfirmDialog.Trigger>
            </ConfirmDialog>
          )}
          
          {(newsletter.status === 'scheduled' || newsletter.status === 'sending') && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="trigger-processing" />
              <Button type="submit" variant="outline" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Iniciar Processamento
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
                  {formatStatusText(newsletter.status)}
                </Badge>
                <span className="flex items-center gap-1">
                  Modelo: {formatTemplateName(newsletter.template_name)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Criada em: {format(new Date(newsletter.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
            
            {newsletter.scheduled_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Agendada para: {format(new Date(newsletter.scheduled_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
            
            {newsletter.sent_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Enviada em: {format(new Date(newsletter.sent_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Conteúdo (MDX)</h3>
            <Card>
              <CardContent className="pt-6">
                <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-md overflow-x-auto">
                  {newsletter.content_mdx}
                </pre>
              </CardContent>
            </Card>
          </div>
          
          {/* Metadata section for sent newsletters */}
          {(newsletter.status === 'sent' || newsletter.status === 'sending') && (
            <div className="space-y-2">
              <h3 className="font-semibold">Informações de Envio</h3>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Segment information */}
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Segmento</p>
                      <p className="text-sm text-muted-foreground">
                        {formattedSegment}
                      </p>
                    </div>
                  </div>
                  
                  {/* Recipient count */}
                  {newsletter.total_recipients !== null && (
                    <div className="flex items-start gap-3">
                      <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Destinatários</p>
                        <p className="text-sm text-muted-foreground">
                          {newsletter.total_recipients} {newsletter.total_recipients === 1 ? 'destinatário' : 'destinatários'}
                          {newsletter.successful_sends !== null && newsletter.failed_sends !== null && (
                            <span className="ml-2">
                              ({newsletter.successful_sends} enviados, {newsletter.failed_sends} falharam)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Send timestamp */}
                  {newsletter.sent_at && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Data de Envio</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(newsletter.sent_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Sender information */}
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Enviado por</p>
                      <p className="text-sm text-muted-foreground">
                        {formattedSender}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {newsletter.status === 'draft' && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Esta newsletter está em modo rascunho. Você pode editá-la ou agendá-la para envio.
              </p>
            </div>
          )}
          
          {newsletter.status === 'scheduled' && (
            <div className="pt-4 border-t">
              {isScheduledAndReady ? (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Pronta para Processamento</p>
                    <p className="text-sm text-muted-foreground">
                      Esta newsletter está agendada e pronta para ser enviada. Ela será processada automaticamente 
                      nos próximos 5 minutos, ou você pode iniciar o processamento manualmente usando o botão acima.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Esta newsletter está agendada para ser enviada em {newsletter.scheduled_at && format(new Date(newsletter.scheduled_at), 'MMM d, yyyy h:mm a')}.
                  Ela será processada automaticamente quando o horário agendado chegar.
                </p>
              )}
            </div>
          )}
          
          {newsletter.status === 'sending' && (
            <div className="pt-4 border-t">
              <div className="flex items-start gap-2">
                <Loader2 className="h-4 w-4 text-blue-500 mt-0.5 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enviando no Momento</p>
                  <p className="text-sm text-muted-foreground">
                    Esta newsletter está sendo processada e enviada aos destinatários.
                    O status será atualizado para "Enviada" quando todos os emails forem entregues.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {newsletter.status === 'sent' && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Esta newsletter foi enviada com sucesso em {newsletter.sent_at && format(new Date(newsletter.sent_at), 'MMM d, yyyy h:mm a')}.
              </p>
            </div>
          )}
          
          {newsletter.status === 'failed' && (
            <div className="pt-4 border-t">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-500">Falha no Envio</p>
                  <p className="text-sm text-muted-foreground">
                    Houve um erro ao enviar esta newsletter. Por favor, verifique os logs para mais informações
                    ou tente iniciar o processamento novamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Preview Modal */}
      <NewsletterPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        subject={newsletter.subject}
        contentMdx={newsletter.content_mdx}
        templateName={newsletter.template_name}
      />
    </div>
  )
}