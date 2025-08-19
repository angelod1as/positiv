import type { FC } from "react"
import { useState } from "react"
import { newsletterFormSchema, type SegmentFilter } from "~/business/admin/newsletter/newsletter-schema"
import { dbValuesToFormSchema } from "~/lib/helpers/db-values-to-form-schema"
import { SchemaForm } from "../base/schema-form"
import { SegmentSelector } from "./segment-selector"

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

export const NewsletterForm: FC<NewsletterFormProps> = ({ newsletter, onSendNow }) => {
  // Format newsletter for the form schema
  const newsletterForForm = newsletter ? {
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
  } : undefined
  
  const formattedNewsletter = newsletter?.id 
    ? dbValuesToFormSchema(newsletterForForm as Record<string, string | number | boolean | null>) 
    : newsletter
  
  // Initialize segment filter state with normalized excludeRejected
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>(() => {
    const base = newsletter?.segment_filter || {}
    // Ensure excludeRejected is always set, prioritizing segment_filter over exclude_rejected
    const excludeRejected = base.excludeRejected ?? newsletter?.exclude_rejected ?? true
    return { ...base, excludeRejected }
  })

  return (
    <div className="space-y-6">
      <SchemaForm
        schema={newsletterFormSchema}
        values={{
          ...formattedNewsletter,
          segment_filter: segmentFilter,
          exclude_rejected: segmentFilter.excludeRejected,
        }}
        labels={{
          subject: "Subject",
          template_name: "Template",
          content_mdx: "Content (MDX)",
          scheduled_at: "Schedule For",
        }}
        placeholders={{
          subject: "Enter newsletter subject",
          content_mdx: "# Newsletter Title\n\nWrite your newsletter content here using Markdown...",
        }}
        multiline={["content_mdx"]}
        inputTypes={{
          template_name: "select",
          scheduled_at: "datetime-local",
        }}
        options={{
          template_name: [
            { value: "general-news", name: "General News" },
            { value: "event-announcement", name: "Event Announcement" },
          ],
        }}
      >
        {({ Field, Button, Errors }) => (
          <>
            {/* Render all the main form fields */}
            <Field name="subject" />
            <Field name="template_name" />
            <Field name="content_mdx" />
            <Field name="scheduled_at" />
            
            {/* Segment Selector section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Audience Segmentation</h3>
              <SegmentSelector
                value={segmentFilter}
                onChange={setSegmentFilter}
              />
            </div>
            
            {/* Hidden fields for segment data */}
            <input type="hidden" name="segment_filter" value={JSON.stringify(segmentFilter)} />
            <input type="hidden" name="exclude_rejected" value={String(segmentFilter.excludeRejected)} />
            
            {/* Form errors */}
            <Errors />
            
            {/* Submit button */}
            <div className="flex gap-4 border-t pt-4">
              <Button>{newsletter?.id ? "Update Newsletter" : "Create Newsletter"}</Button>
              {newsletter?.id && newsletter?.status === "draft" && onSendNow && (
                <button
                  type="button"
                  onClick={() => {
                    if (newsletter.id) {
                      onSendNow(newsletter.id)
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Send Now
                </button>
              )}
            </div>
          </>
        )}
      </SchemaForm>
    </div>
  )
}