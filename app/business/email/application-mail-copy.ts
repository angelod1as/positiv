import { applicationMailContent } from "~/copy/emails/application-mail"
import { renderInlineBlocks } from "./render-inline-portable-text"

export type ApplicationCopy = {
  subject: string
  heading: string
  bodyParagraphs: string[]
  importantHeading: string
  importantLead: string
  notes: string[]
}

export const applicationCopyFallback: ApplicationCopy = {
  subject: applicationMailContent.subject,
  heading: applicationMailContent.heading,
  bodyParagraphs: renderInlineBlocks(applicationMailContent.body),
  importantHeading: applicationMailContent.importantHeading,
  importantLead: applicationMailContent.importantLead,
  notes: renderInlineBlocks(applicationMailContent.notes),
}
