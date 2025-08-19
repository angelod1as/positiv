import type { FC } from "react"
import { useNavigation } from "react-router"
import {
  newsletterFormSchema,
  type SegmentFilter,
} from "~/business/admin/newsletter/newsletter-schema"
import { dbValuesToFormSchema } from "~/lib/helpers/db-values-to-form-schema"
import { SchemaForm } from "../base/schema-form"

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

type NewsletterFormProps = {
  newsletter?: Newsletter
  onSendNow?: (newsletterId: string) => void
}

export const NewsletterForm: FC<NewsletterFormProps> = ({
  newsletter,
  onSendNow,
}) => {
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  // Format newsletter for the form schema
  const newsletterForForm = newsletter
    ? {
        id: newsletter.id,
        subject: newsletter.subject,
        template_name: newsletter.template_name,
        content_mdx: newsletter.content_mdx,
        scheduled_at: newsletter.scheduled_at,
        status: newsletter.status,
        created_at: newsletter.created_at,
        updated_at: newsletter.updated_at,
        created_by: newsletter.created_by,
        sent_at: newsletter.sent_at,
        send_started_at: newsletter.send_started_at,
        send_completed_at: newsletter.send_completed_at,
        total_recipients: newsletter.total_recipients,
        successful_sends: newsletter.successful_sends,
        failed_sends: newsletter.failed_sends,
      }
    : undefined

  const formattedNewsletter = newsletter?.id
    ? dbValuesToFormSchema(
        newsletterForForm as Record<string, string | number | boolean | null>,
      )
    : newsletter

  // Determine initial segment type for the dropdown
  const getSegmentType = (filter?: SegmentFilter | null): string => {
    if (!filter) return "all"
    if (filter.veteransOnly) return "veterans"
    if (filter.newbiesOnly) return "newbies"
    if (filter.activityType === "never_attended") return "never_attended"
    if (filter.activityType === "has_attended") return "has_attended"
    if (filter.activityType === "never_applied") return "never_applied"
    if (filter.activityType === "applied_never_attended") return "applied_never_attended"
    return "all"
  }
  
  const initialSegmentType = getSegmentType(newsletter?.segment_filter)
  const initialExcludeRejected = newsletter?.segment_filter?.excludeRejected ?? newsletter?.exclude_rejected ?? true

  return (
    <div className="space-y-6">
      <SchemaForm
        schema={newsletterFormSchema}
        values={{
          ...formattedNewsletter,
          segment_type: initialSegmentType || 'all',
          exclude_rejected: initialExcludeRejected,
        }}
        labels={{
          subject: "Subject",
          template_name: "Template",
          content_mdx: "Content (MDX)",
          scheduled_at: "Schedule For",
          segment_type: "Audience Segment",
          exclude_rejected: "Exclude rejected participants",
        }}
        placeholders={{
          subject: "Enter newsletter subject",
          content_mdx:
            "# Newsletter Title\n\nWrite your newsletter content here using Markdown...",
        }}
        multiline={["content_mdx"]}
        inputTypes={{
          template_name: "select",
          segment_type: "select",
          scheduled_at: "datetime-local",
          exclude_rejected: "checkbox",
        }}
        options={{
          template_name: [
            { value: "general-news", name: "General News" },
            { value: "event-announcement", name: "Event Announcement" },
          ],
          segment_type: [
            { value: "all", name: "All subscribers" },
            { value: "veterans", name: "Veterans only" },
            { value: "newbies", name: "Newbies only" },
            { value: "never_attended", name: "Never attended any event" },
            { value: "has_attended", name: "Has attended at least one event" },
            { value: "never_applied", name: "New registrations" },
            { value: "applied_never_attended", name: "Applied but never attended" },
          ],
        }}
        buttonLabel={
          isSubmitting 
            ? "Processing..." 
            : (newsletter?.id ? "Update Newsletter" : "Create Newsletter")
        }
      />
      
      {/* Send Now button for existing drafts */}
      {newsletter?.id && newsletter?.status === "draft" && onSendNow && (
        <button
          type="button"
          onClick={() => {
            if (newsletter.id) {
              onSendNow(newsletter.id)
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Send Now
        </button>
      )}
    </div>
  )
}
