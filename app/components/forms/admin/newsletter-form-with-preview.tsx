import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from 'react-router'
import { useNavigation } from 'react-router'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Checkbox } from '~/components/ui/checkbox'
import { MDXComponentsDocs } from '~/components/organisms/newsletter/mdx-components-docs'
import { NewsletterEditorWithPreview } from '~/components/organisms/newsletter/newsletter-editor-with-preview'
import type { SegmentFilter } from '~/business/admin/newsletter/newsletter-schema'

// Define the schema directly here to match the form values
const newsletterFormSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  template_name: z.enum(['general-news', 'event-announcement'], {
    errorMap: () => ({ message: 'Please select a valid template' }),
  }),
  content_mdx: z.string().min(1, 'Content is required'),
  scheduled_at: z.string().optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
  segment_type: z.enum([
    'all',
    'veterans',
    'newbies',
    'never_attended',
    'has_attended',
    'never_applied',
    'applied_never_attended'
  ]).optional(),
  exclude_rejected: z.boolean().optional(),
})

type NewsletterFormValues = z.infer<typeof newsletterFormSchema>

type Newsletter = {
  id?: string
  subject?: string
  template_name?: string
  content_mdx?: string
  scheduled_at?: string | null
  status?: string
  created_at?: string
  updated_at?: string
  created_by?: string | null
  sent_at?: string | null
  send_started_at?: string | null
  send_completed_at?: string | null
  total_recipients?: number | null
  successful_sends?: number | null
  failed_sends?: number | null
  segment_filter?: SegmentFilter | null
  exclude_rejected?: boolean | null
}

type NewsletterFormWithPreviewProps = {
  newsletter?: Newsletter
  onSendNow?: (newsletterId: string) => void
}

export function NewsletterFormWithPreview({
  newsletter,
  onSendNow,
}: NewsletterFormWithPreviewProps) {
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  // Determine initial values
  const getSegmentType = (filter?: SegmentFilter | null): string => {
    if (!filter) return 'all'
    if (filter.veteransOnly) return 'veterans'
    if (filter.newbiesOnly) return 'newbies'
    if (filter.activityType === 'never_attended') return 'never_attended'
    if (filter.activityType === 'has_attended') return 'has_attended'
    if (filter.activityType === 'never_applied') return 'never_applied'
    if (filter.activityType === 'applied_never_attended') return 'applied_never_attended'
    return 'all'
  }

  const initialSegmentType = getSegmentType(newsletter?.segment_filter)
  const initialExcludeRejected = newsletter?.segment_filter?.excludeRejected ?? newsletter?.exclude_rejected ?? true

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues: {
      subject: newsletter?.subject || '',
      template_name: (newsletter?.template_name || 'general-news') as 'general-news' | 'event-announcement',
      content_mdx: newsletter?.content_mdx || '',
      scheduled_at: newsletter?.scheduled_at || undefined,
      segment_type: initialSegmentType as 'all' | 'veterans' | 'newbies' | 'never_attended' | 'has_attended' | 'never_applied' | 'applied_never_attended' | undefined,
      exclude_rejected: initialExcludeRejected,
    }
  })

  // Watch the values we need for preview
  const contentMdx = watch('content_mdx')
  const templateName = watch('template_name')

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute right-0 -top-2 z-10">
          <MDXComponentsDocs />
        </div>

        <Form 
          method="post" 
          onSubmit={handleSubmit(() => {})}
          className="space-y-6"
        >
          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              {...register('subject')}
              placeholder="Digite o assunto da newsletter"
              aria-invalid={!!errors.subject}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
          </div>

          {/* Template Field */}
          <div className="space-y-2">
            <Label htmlFor="template_name">Modelo</Label>
            <Select
              value={templateName}
              onValueChange={(value) => {
                setValue('template_name', value as 'general-news' | 'event-announcement')
              }}
            >
              <SelectTrigger id="template_name" data-testid="template-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general-news">Notícias Gerais</SelectItem>
                <SelectItem value="event-announcement">Anúncio de Evento</SelectItem>
              </SelectContent>
            </Select>
            {/* Hidden inputs for form submission and E2E testing */}
            <input type="hidden" name="template_name" value={templateName} />
            <select 
              name="template_name" 
              value={templateName}
              onChange={(e) => setValue('template_name', e.target.value as 'general-news' | 'event-announcement')}
              className="sr-only"
              aria-hidden="true"
            >
              <option value="general-news">Notícias Gerais</option>
              <option value="event-announcement">Anúncio de Evento</option>
            </select>
            {errors.template_name && (
              <p className="text-sm text-destructive">{errors.template_name.message}</p>
            )}
          </div>

          {/* Content MDX with Live Preview */}
          <div className="space-y-2">
            <Label htmlFor="content_mdx">Conteúdo (MDX)</Label>
            <NewsletterEditorWithPreview
              value={contentMdx}
              onChange={(value) => {
                setValue('content_mdx', value)
              }}
              templateName={templateName}
              placeholder="# Título da Newsletter&#10;&#10;Escreva o conteúdo da sua newsletter aqui usando Markdown..."
              data-testid="content-mdx"
            />
            {/* Hidden inputs for form submission and E2E testing */}
            <input type="hidden" name="content_mdx" value={contentMdx} />
            <textarea 
              name="content_mdx" 
              value={contentMdx}
              onChange={(e) => setValue('content_mdx', e.target.value)}
              className="sr-only"
              aria-hidden="true"
            />
            {errors.content_mdx && (
              <p className="text-sm text-destructive">{errors.content_mdx.message}</p>
            )}
          </div>

          {/* Scheduled At Field */}
          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Agendar Para (opcional)</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              {...register('scheduled_at')}
              aria-invalid={!!errors.scheduled_at}
            />
            {errors.scheduled_at && (
              <p className="text-sm text-destructive">{errors.scheduled_at.message}</p>
            )}
          </div>

          {/* Segment Type Field */}
          <div className="space-y-2">
            <Label htmlFor="segment_type">Segmento de Público</Label>
            <Select
              value={watch('segment_type') || 'all'}
              onValueChange={(value) => {
                setValue('segment_type', value as 'all' | 'veterans' | 'newbies' | 'never_attended' | 'has_attended' | 'never_applied' | 'applied_never_attended')
              }}
            >
              <SelectTrigger id="segment_type" data-testid="segment-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os inscritos</SelectItem>
                <SelectItem value="veterans">Apenas veteranos</SelectItem>
                <SelectItem value="newbies">Apenas novatos</SelectItem>
                <SelectItem value="never_attended">Nunca participou de nenhum evento</SelectItem>
                <SelectItem value="has_attended">Participou de pelo menos um evento</SelectItem>
                <SelectItem value="never_applied">Novos cadastros</SelectItem>
                <SelectItem value="applied_never_attended">Se inscreveu mas nunca participou</SelectItem>
              </SelectContent>
            </Select>
            {/* Hidden inputs for form submission and E2E testing */}
            <input type="hidden" name="segment_type" value={watch('segment_type') || 'all'} />
            <select 
              name="segment_type" 
              value={watch('segment_type') || 'all'}
              onChange={(e) => setValue('segment_type', e.target.value as 'all' | 'veterans' | 'newbies' | 'never_attended' | 'has_attended' | 'never_applied' | 'applied_never_attended')}
              className="sr-only"
              aria-hidden="true"
            >
              <option value="all">Todos os inscritos</option>
              <option value="veterans">Apenas veteranos</option>
              <option value="newbies">Apenas novatos</option>
              <option value="never_attended">Nunca participou de nenhum evento</option>
              <option value="has_attended">Participou de pelo menos um evento</option>
              <option value="never_applied">Novos cadastros</option>
              <option value="applied_never_attended">Se inscreveu mas nunca participou</option>
            </select>
            {errors.segment_type && (
              <p className="text-sm text-destructive">{errors.segment_type.message}</p>
            )}
          </div>

          {/* Exclude Rejected Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="exclude_rejected"
              checked={watch('exclude_rejected')}
              onChange={(e) => {
                setValue('exclude_rejected', (e.target as HTMLInputElement).checked)
              }}
            />
            <div className="space-y-1">
              <Label
                htmlFor="exclude_rejected"
                className="text-sm font-normal cursor-pointer"
              >
                Excluir participantes rejeitados
              </Label>
            </div>
            {/* Hidden input with string value for form submission */}
            <input type="hidden" name="exclude_rejected" value={String(watch('exclude_rejected'))} />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting 
              ? 'Processando...' 
              : (newsletter?.id ? 'Atualizar Newsletter' : 'Criar Newsletter')
            }
          </Button>
        </Form>
      </div>

      {/* Send Now button for existing drafts */}
      {newsletter?.id && newsletter?.status === 'draft' && onSendNow && (
        <Button
          type="button"
          onClick={() => {
            if (newsletter.id) {
              onSendNow(newsletter.id)
            }
          }}
          disabled={isSubmitting}
          variant="outline"
        >
          Enviar Agora
        </Button>
      )}
    </div>
  )
}