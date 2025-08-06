import { describe, expect, it, vi, beforeEach } from 'vitest'
import { json } from 'react-router'
import { loader, action } from './new'
import { createNewsletter } from '~/business/admin/newsletter/newsletter.server'

// Mock dependencies
vi.mock('~/lib/paths', () => ({
  default: {
    admin: {
      newsletters: {
        ADMIN_NEWSLETTERS: () => '/admin/newsletters',
      },
    },
  },
}))

vi.mock('~/business/admin/admin.server', () => ({
  getAdminContext: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

vi.mock('~/business/admin/newsletter/newsletter.server', () => ({
  createNewsletter: vi.fn(),
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
}))

describe('New Newsletter Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loader', () => {
    it('should return admin context', async () => {
      const request = new Request('http://localhost:3000/admin/newsletters/new')
      const result = await loader({ request, params: {} } as any)
      
      expect(result).toEqual({ userId: 'test-user-id' })
    })
  })

  describe('action', () => {
    it('should create a newsletter and redirect on success', async () => {
      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        template_name: 'general-news',
        content_mdx: '# Test Content',
        status: 'draft',
      }
      
      const mockCreateNewsletter = vi.mocked(createNewsletter)
      mockCreateNewsletter.mockResolvedValue(mockNewsletter)
      
      const formData = new FormData()
      formData.append('subject', 'Test Newsletter')
      formData.append('template_name', 'general-news')
      formData.append('content_mdx', '# Test Content')
      
      const request = new Request('http://localhost:3000/admin/newsletters/new', {
        method: 'POST',
        body: formData,
      })
      
      const actionFunction = await action({ request, params: {} } as any)
      await expect(actionFunction({ request, params: {} })).rejects.toThrow()
      
      expect(mockCreateNewsletter).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Test Newsletter',
        template_name: 'general-news',
        content_mdx: '# Test Content',
      }))
    })

    it('should handle scheduled newsletters', async () => {
      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Scheduled Newsletter',
        template_name: 'event-announcement',
        content_mdx: '# Event Content',
        status: 'scheduled',
        scheduled_at: '2025-12-25T10:00:00',
      }
      
      const mockCreateNewsletter = vi.mocked(createNewsletter)
      mockCreateNewsletter.mockResolvedValue(mockNewsletter)
      
      const formData = new FormData()
      formData.append('subject', 'Scheduled Newsletter')
      formData.append('template_name', 'event-announcement')
      formData.append('content_mdx', '# Event Content')
      formData.append('scheduled_at', '2025-12-25T10:00:00')
      formData.append('status', 'scheduled')
      
      const request = new Request('http://localhost:3000/admin/newsletters/new', {
        method: 'POST',
        body: formData,
      })
      
      const actionFunction = await action({ request, params: {} } as any)
      await expect(actionFunction({ request, params: {} })).rejects.toThrow()
      
      expect(mockCreateNewsletter).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Scheduled Newsletter',
        template_name: 'event-announcement',
        content_mdx: '# Event Content',
        scheduled_at: '2025-12-25T10:00:00',
        status: 'scheduled',
      }))
    })
  })
})