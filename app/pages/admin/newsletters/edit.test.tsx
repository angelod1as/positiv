import { describe, expect, it, vi, beforeEach } from 'vitest'
import { loader, action } from './edit'
import { getNewsletterById, updateNewsletter } from '~/business/admin/newsletter/newsletter.server'
import type { Route } from './+types/edit'

// Mock dependencies
vi.mock('~/lib/paths', () => ({
  default: {
    admin: {
      newsletters: {
        ADMIN_NEWSLETTERS: () => '/admin/newsletters',
        ADMIN_VIEW_NEWSLETTER: (id: string) => `/admin/newsletters/${id}`,
      },
    },
  },
}))

vi.mock('~/business/admin/admin.server', () => ({
  getAdminContext: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

vi.mock('~/business/admin/newsletter/newsletter.server', () => ({
  getNewsletterById: vi.fn(),
  updateNewsletter: vi.fn(),
  sendNewsletterNow: vi.fn(),
}))

vi.mock('~/business/admin/newsletter/newsletter-segments.server', () => ({
  getSegmentDescriptions: vi.fn().mockResolvedValue([]),
}))

vi.mock('~/lib/supabase/db.server', () => ({
  db: {},
}))

vi.mock('remix-forms', () => ({
  formAction: vi.fn(async (config) => {
    const clonedRequest = config.request.clone()
    const formData = await clonedRequest.formData()
    const data = Object.fromEntries(formData)
    const context = config.context
    const result = await config.mutation(data, context)
    if (config.transformResult) {
      return config.transformResult(result)
    }
    return result
  }),
  applySchema: vi.fn((_schema, _contextSchema) => {
    return (mutationFn: unknown) => mutationFn
  }),
}))

vi.mock('remix-toast', () => ({
  redirectWithSuccess: vi.fn((path, _message) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
  redirectWithToast: vi.fn((path, _toast) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
}))

describe('Edit Newsletter Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loader', () => {
    it('should load newsletter by id for editing', async () => {
      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        template_name: 'general-news',
        content_mdx: '# Test Content',
        status: 'draft',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z',
        created_by: 'user-123',
        sent_at: null,
        scheduled_at: null,
        send_started_at: null,
        send_completed_at: null,
        total_recipients: null,
        successful_sends: null,
        failed_sends: null,
        exclude_rejected: true,
        expected_recipient_count: null,
        segment_filter: null,
      }      
      const mockGetNewsletterById = vi.mocked(getNewsletterById)
      mockGetNewsletterById.mockResolvedValue(mockNewsletter)
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit')
      const result = await loader({ 
        request, 
        params: { id: 'newsletter-123' }
      } as Route.ActionArgs)
      
      expect(mockGetNewsletterById).toHaveBeenCalledWith('newsletter-123')
      expect(result).toEqual({ 
        newsletter: mockNewsletter,
        segments: []
      })
    })

    it('should redirect if newsletter not found', async () => {
      const mockGetNewsletterById = vi.mocked(getNewsletterById)
      mockGetNewsletterById.mockResolvedValue(undefined)
      
      const request = new Request('http://localhost:3000/admin/newsletters/invalid-id/edit')
      
      await expect(loader({ 
        request, 
        params: { id: 'invalid-id' }
      } as Route.ActionArgs)).rejects.toThrow()
      
      expect(mockGetNewsletterById).toHaveBeenCalledWith('invalid-id')
    })

    it('should redirect if newsletter is not in draft status', async () => {
      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Sent Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'sent',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z',
        created_by: 'user-123',
        sent_at: '2025-01-01T11:00:00Z',
        scheduled_at: null,
        send_started_at: null,
        send_completed_at: null,
        total_recipients: null,
        successful_sends: null,
        failed_sends: null,
        exclude_rejected: true,
        expected_recipient_count: null,
        segment_filter: null,
      }
      
      const mockGetNewsletterById = vi.mocked(getNewsletterById)
      mockGetNewsletterById.mockResolvedValue(mockNewsletter)
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit')
      
      await expect(loader({ 
        request, 
        params: { id: 'newsletter-123' }
      } as Route.ActionArgs)).rejects.toThrow()
    })
  })

  describe('action', () => {
    it('should update a newsletter and redirect on success', async () => {
      const mockUpdatedNewsletter = {
        id: 'newsletter-123',
        subject: 'Updated Newsletter',
        template_name: 'event-announcement',
        content_mdx: '# Updated Content',
        status: 'draft',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T11:00:00Z',
        created_by: 'user-123',
        sent_at: null,
        scheduled_at: null,
        send_started_at: null,
        send_completed_at: null,
        total_recipients: null,
        successful_sends: null,
        failed_sends: null,
        exclude_rejected: true,
        expected_recipient_count: null,
        segment_filter: null,
      }
      
      const mockUpdateNewsletter = vi.mocked(updateNewsletter)
      mockUpdateNewsletter.mockResolvedValue(mockUpdatedNewsletter)
      
      const body = new URLSearchParams()
      body.append('subject', 'Updated Newsletter')
      body.append('template_name', 'event-announcement')
      body.append('content_mdx', '# Updated Content')
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      
      // The action directly calls formAction
      await expect(action({ request, params: { id: 'newsletter-123' } } as Route.ActionArgs)).rejects.toThrow()
      
      expect(mockUpdateNewsletter).toHaveBeenCalledWith('newsletter-123', expect.objectContaining({
        subject: 'Updated Newsletter',
        template_name: 'event-announcement',
        content_mdx: '# Updated Content',
      }))
    })

    it('should handle scheduled newsletter updates', async () => {
      const mockUpdatedNewsletter = {
        id: 'newsletter-123',
        subject: 'Scheduled Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'scheduled',
        scheduled_at: '2025-12-25T10:00:00',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T11:00:00Z',
        created_by: 'user-123',
        sent_at: null,
        send_started_at: null,
        send_completed_at: null,
        total_recipients: null,
        successful_sends: null,
        failed_sends: null,
        exclude_rejected: true,
        expected_recipient_count: null,
        segment_filter: null,
      }
      
      const mockUpdateNewsletter = vi.mocked(updateNewsletter)
      mockUpdateNewsletter.mockResolvedValue(mockUpdatedNewsletter)
      
      const body = new URLSearchParams()
      body.append('subject', 'Scheduled Newsletter')
      body.append('template_name', 'general-news')
      body.append('content_mdx', '# Content')
      body.append('scheduled_at', '2025-12-25T10:00:00')
      body.append('status', 'scheduled')
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      
      // The action directly calls formAction
      await expect(action({ request, params: { id: 'newsletter-123' } } as Route.ActionArgs)).rejects.toThrow()
      
      expect(mockUpdateNewsletter).toHaveBeenCalledWith('newsletter-123', expect.objectContaining({
        subject: 'Scheduled Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        scheduled_at: '2025-12-25T10:00:00',
        status: 'scheduled',
      }))
    })

    it('should handle missing newsletter id', async () => {
      const body = new URLSearchParams()
      body.append('subject', 'Newsletter')
      
      const request = new Request('http://localhost:3000/admin/newsletters/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      
      await expect(action({ request, params: {} } as Route.ActionArgs)).rejects.toThrow()
      
      expect(updateNewsletter).not.toHaveBeenCalled()
    })

    it('should handle send-now intent', async () => {
      const { sendNewsletterNow } = await import('~/business/admin/newsletter/newsletter.server')
      const mockSendNewsletterNow = vi.mocked(sendNewsletterNow)
      mockSendNewsletterNow.mockResolvedValue({
        success: true,
        processed: 10,
        failed: 0,
        newsletterId: 'newsletter-123',
      })
      
      const body = new URLSearchParams()
      body.append('intent', 'send-now')
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      
      await expect(action({ request, params: { id: 'newsletter-123' } } as Route.ActionArgs)).rejects.toThrow()
      
      expect(mockSendNewsletterNow).toHaveBeenCalledWith('newsletter-123')
    })
  })
})