import { describe, expect, it } from 'vitest'
import { newsletterFormSchema } from './newsletter-schema'

describe('Newsletter Form Schema', () => {
  describe('valid inputs', () => {
    it('should accept valid newsletter data with all required fields', () => {
      const validData = {
        subject: 'Monthly Newsletter',
        template_name: 'general-news',
        content_mdx: '# Hello World\n\nThis is our newsletter content.',
      }

      const result = newsletterFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          ...validData,
          segment_type: 'all',
          exclude_rejected: false
        })
      }
    })

    it('should accept event-announcement template', () => {
      const validData = {
        subject: 'New Event Announcement',
        template_name: 'event-announcement',
        content_mdx: '# New Event!\n\nJoin us for an amazing event.',
      }

      const result = newsletterFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.template_name).toBe('event-announcement')
      }
    })

    it('should accept optional scheduled_at field', () => {
      const validData = {
        subject: 'Scheduled Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        scheduled_at: '2025-12-25T10:00:00',
      }

      const result = newsletterFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scheduled_at).toBe('2025-12-25T10:00:00')
      }
    })

    it('should accept optional status field', () => {
      const validData = {
        subject: 'Draft Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'draft',
      }

      const result = newsletterFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('draft')
      }
    })

    it('should accept scheduled status', () => {
      const validData = {
        subject: 'Scheduled Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'scheduled',
        scheduled_at: '2025-12-25T10:00:00',
      }

      const result = newsletterFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('scheduled')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject empty subject', () => {
      const invalidData = {
        subject: '',
        template_name: 'general-news',
        content_mdx: '# Content',
      }

      const result = newsletterFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['subject'])
      }
    })

    it('should reject missing subject', () => {
      const invalidData = {
        template_name: 'general-news',
        content_mdx: '# Content',
      }

      const result = newsletterFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['subject'])
      }
    })

    it('should reject empty content_mdx', () => {
      const invalidData = {
        subject: 'Newsletter',
        template_name: 'general-news',
        content_mdx: '',
      }

      const result = newsletterFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['content_mdx'])
      }
    })

    it('should reject invalid template_name', () => {
      const invalidData = {
        subject: 'Newsletter',
        template_name: 'invalid-template',
        content_mdx: '# Content',
      }

      const result = newsletterFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['template_name'])
      }
    })

    it('should reject invalid status', () => {
      const invalidData = {
        subject: 'Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'invalid-status',
      }

      const result = newsletterFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['status'])
      }
    })
  })

  describe('edge cases', () => {
    it('should handle very long subject', () => {
      const validData = {
        subject: 'A'.repeat(500),
        template_name: 'general-news',
        content_mdx: '# Content',
      }

      const result = newsletterFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should handle multiline MDX content', () => {
      const validData = {
        subject: 'Newsletter',
        template_name: 'general-news',
        content_mdx: `# Title
        
## Subtitle

This is a paragraph with **bold** and *italic* text.

<EventCard title="Event Name" date="2025-12-25" />

- List item 1
- List item 2

<Button href="https://example.com">Click me</Button>`,
      }

      const result = newsletterFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})