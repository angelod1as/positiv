import { z } from 'zod'

export const newsletterFormSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  template_name: z.enum(['general-news', 'event-announcement'], {
    errorMap: () => ({ message: 'Please select a valid template' }),
  }),
  content_mdx: z.string().min(1, 'Content is required'),
  scheduled_at: z.string().optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
})

export type NewsletterFormData = z.infer<typeof newsletterFormSchema>