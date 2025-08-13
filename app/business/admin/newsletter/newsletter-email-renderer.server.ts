import { renderAsync } from "@react-email/components"
import EventAnnouncementTemplate from "~/components/email/templates/newsletter/event-announcement"
import GeneralNewsTemplate from "~/components/email/templates/newsletter/general-news"
import { htmlToText } from "html-to-text"

interface RenderOptions {
  subject: string
  templateName: string
  content: string
  unsubscribeUrl: string
}

export async function renderNewsletterEmail(options: RenderOptions): Promise<{
  html: string
  text: string
}> {
  const { subject, templateName, content, unsubscribeUrl } = options

  // Select the appropriate template
  const Template = templateName === "event-announcement" 
    ? EventAnnouncementTemplate 
    : GeneralNewsTemplate

  // Render the email HTML
  const html = await renderAsync(
    Template({
      subject,
      content,
      unsubscribeUrl,
    })
  )

  // Convert HTML to plain text
  const text = htmlToText(html, {
    wordwrap: 130,
    selectors: [
      { selector: "a", options: { baseUrl: process.env.APP_URL || "http://localhost:5173" } },
      { selector: "img", format: "skip" },
    ],
  })

  return { html, text }
}