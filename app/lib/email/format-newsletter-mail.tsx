import { render } from "@react-email/components"
import { htmlToText } from "html-to-text"
import type { Newsletter } from "~types/entities.types"
import NewsletterEmail from "./templates/emails/newsletter-email"

export const formatNewsletterMail = async (newsletter: Newsletter) => {
  console.log(`\n\n:DEV newsletter:\n`, newsletter, `\n\n`)
  const html = await render(<NewsletterEmail newsletter={newsletter} />)
  const text = htmlToText(html)
  return { html, text }
}
