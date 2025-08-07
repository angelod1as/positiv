import { render } from "@react-email/components"
import { htmlToText } from "html-to-text"
import { EventAnnouncement } from "~/components/email/templates/newsletter/event-announcement"
import { GeneralNews } from "~/components/email/templates/newsletter/general-news"

export type NewsletterTemplate = "event-announcement" | "general-news"

interface FormatNewsletterMailProps {
  subject: string
  content: string
  template: NewsletterTemplate
  unsubscribeUrl: string
}

export const formatNewsletterMail = async ({
  subject,
  content,
  template,
  unsubscribeUrl,
}: FormatNewsletterMailProps) => {
  const EmailComponent = template === "event-announcement" ? EventAnnouncement : GeneralNews
  
  const html = await render(
    <EmailComponent 
      subject={subject}
      content={content}
      unsubscribeUrl={unsubscribeUrl}
    />
  )
  
  const text = htmlToText(html, {
    wordwrap: 130,
    selectors: [
      { selector: 'a', options: { baseUrl: 'https://positiv.com' } },
      { selector: 'img', format: 'skip' }
    ]
  })

  return { text, html }
}