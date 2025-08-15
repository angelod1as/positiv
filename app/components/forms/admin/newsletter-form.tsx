import type { FC } from "react"
import { newsletterFormSchema } from "~/business/admin/newsletter/newsletter-schema"
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
}

type NewsletterFormProps = {
  newsletter?: Newsletter
  onSendNow?: (newsletterId: string) => void
}

export const NewsletterForm: FC<NewsletterFormProps> = ({ newsletter, onSendNow }) => {
  const formattedNewsletter = newsletter?.id ? dbValuesToFormSchema(newsletter) : newsletter

  return (
    <div>
      <SchemaForm
        schema={newsletterFormSchema}
        values={formattedNewsletter}
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
        {({ Button: SubmitButton }) => (
          <div className="flex gap-4">
            <SubmitButton>{newsletter?.id ? "Update Newsletter" : "Create Newsletter"}</SubmitButton>
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
        )}
      </SchemaForm>
    </div>
  )
}