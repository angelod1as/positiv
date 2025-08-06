import { describe, expect, it, vi, beforeEach } from 'vitest'
import { loader, action } from './edit'
import { getNewsletterById, updateNewsletter } from '~/business/admin/newsletter/newsletter.server'

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
}))

vi.mock('remix-forms', () => ({
  formAction: vi.fn((config) => {
    return async ({ request, params }: any) => {
      const formData = await request.formData()
      const data = Object.fromEntries(formData)
      const context = config.context || (await config.contextFactory?.({ request, params }))
      const result = await config.mutation(data, context)
      if (config.transformResult) {
        return config.transformResult(result)
      }
      return result
    }
  }),
}))

vi.mock('remix-toast', () => ({
  redirectWithSuccess: vi.fn((path, message) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
  redirectWithToast: vi.fn((path, toast) => {
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
      }
      
      const mockGetNewsletterById = vi.mocked(getNewsletterById)
      mockGetNewsletterById.mockResolvedValue(mockNewsletter)
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit')
      const result = await loader({ 
        request, 
        params: { id: 'newsletter-123' }
      } as any)
      
      expect(mockGetNewsletterById).toHaveBeenCalledWith('newsletter-123')
      expect(result).toEqual({ newsletter: mockNewsletter })
    })

    it('should redirect if newsletter not found', async () => {
      const mockGetNewsletterById = vi.mocked(getNewsletterById)
      mockGetNewsletterById.mockResolvedValue(null)
      
      const request = new Request('http://localhost:3000/admin/newsletters/invalid-id/edit')
      
      await expect(loader({ 
        request, 
        params: { id: 'invalid-id' }
      } as any)).rejects.toThrow()
      
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
      }
      
      const mockGetNewsletterById = vi.mocked(getNewsletterById)
      mockGetNewsletterById.mockResolvedValue(mockNewsletter)
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit')
      
      await expect(loader({ 
        request, 
        params: { id: 'newsletter-123' }
      } as any)).rejects.toThrow()
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
      }
      
      const mockUpdateNewsletter = vi.mocked(updateNewsletter)
      mockUpdateNewsletter.mockResolvedValue(mockUpdatedNewsletter)
      
      const formData = new FormData()
      formData.append('subject', 'Updated Newsletter')
      formData.append('template_name', 'event-announcement')
      formData.append('content_mdx', '# Updated Content')
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit', {
        method: 'POST',
        body: formData,
      })
      
      const actionFunction = await action({ request, params: { id: 'newsletter-123' } } as any)
      await expect(actionFunction({ request, params: { id: 'newsletter-123' } })).rejects.toThrow()
      
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
      }
      
      const mockUpdateNewsletter = vi.mocked(updateNewsletter)
      mockUpdateNewsletter.mockResolvedValue(mockUpdatedNewsletter)
      
      const formData = new FormData()
      formData.append('subject', 'Scheduled Newsletter')
      formData.append('template_name', 'general-news')
      formData.append('content_mdx', '# Content')
      formData.append('scheduled_at', '2025-12-25T10:00:00')
      formData.append('status', 'scheduled')
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123/edit', {
        method: 'POST',
        body: formData,
      })
      
      const actionFunction = await action({ request, params: { id: 'newsletter-123' } } as any)
      await expect(actionFunction({ request, params: { id: 'newsletter-123' } })).rejects.toThrow()
      
      expect(mockUpdateNewsletter).toHaveBeenCalledWith('newsletter-123', expect.objectContaining({
        subject: 'Scheduled Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        scheduled_at: '2025-12-25T10:00:00',
        status: 'scheduled',
      }))
    })

    it('should handle missing newsletter id', async () => {
      const formData = new FormData()
      formData.append('subject', 'Newsletter')
      
      const request = new Request('http://localhost:3000/admin/newsletters/edit', {
        method: 'POST',
        body: formData,
      })
      
      const actionFunction = await action({ request, params: {} } as any)
      await expect(actionFunction({ request, params: {} })).rejects.toThrow()
      
      expect(updateNewsletter).not.toHaveBeenCalled()
    })
  })
})