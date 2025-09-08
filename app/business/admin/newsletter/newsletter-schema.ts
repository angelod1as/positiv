import { z } from 'zod'

export const segmentFilterSchema = z.object({
  adminsOnly: z.boolean().optional(),
  veteransOnly: z.boolean().optional(),
  newbiesOnly: z.boolean().optional(),
  newRegistrations: z.boolean().optional(),
  appliedNeverAttended: z.boolean().optional(),
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
  segment_type: z.enum([
    'all',
    'admins',
    'veterans',
    'newbies',
    'new_registrations_30d',
    'applied_never_attended'
  ]).optional().default('all'),
  exclude_rejected: z.preprocess(
    (val) => val === 'on' || val === true || val === 'true',
    z.boolean().optional()
  ),
})

export type SegmentFilter = z.infer<typeof segmentFilterSchema>
export type NewsletterFormData = z.infer<typeof newsletterFormSchema>