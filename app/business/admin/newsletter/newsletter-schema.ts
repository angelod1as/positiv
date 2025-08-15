import { z } from 'zod'

export const segmentFilterSchema = z.object({
  veteransOnly: z.boolean().optional(),
  newbiesOnly: z.boolean().optional(),
  activityType: z.enum([
    'never_attended',
    'has_attended',
    'never_applied',
    'applied_never_attended'
  ]).optional(),
  registeredWithinDays: z.number().optional(), // Only used with activityType "never_applied"
  excludeRejected: z.boolean().optional(),
})

export const newsletterFormSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  template_name: z.enum(['general-news', 'event-announcement'], {
    errorMap: () => ({ message: 'Please select a valid template' }),
  }),
  content_mdx: z.string().min(1, 'Content is required'),
  scheduled_at: z.string().optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
  segment_filter: segmentFilterSchema.optional(),
  exclude_rejected: z.boolean().optional(),
})

export type SegmentFilter = z.infer<typeof segmentFilterSchema>
export type NewsletterFormData = z.infer<typeof newsletterFormSchema>