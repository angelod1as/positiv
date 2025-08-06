import { describe, expect, it, vi, beforeEach } from 'vitest'
import { loader } from './view'
import { getNewsletterById } from '~/business/admin/newsletter/newsletter.server'

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
  getNewsletterById: vi.fn(),
}))

vi.mock('remix-toast', () => ({
  redirectWithToast: vi.fn((path, toast) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
}))

describe('View Newsletter Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loader', () => {
    it('should load newsletter by id', async () => {
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
      
      const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123')
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
      
      const request = new Request('http://localhost:3000/admin/newsletters/invalid-id')
      
      await expect(loader({ 
        request, 
        params: { id: 'invalid-id' }
      } as any)).rejects.toThrow()
      
      expect(mockGetNewsletterById).toHaveBeenCalledWith('invalid-id')
    })

    it('should handle missing id parameter', async () => {
      const request = new Request('http://localhost:3000/admin/newsletters/')
      
      await expect(loader({ 
        request, 
        params: {}
      } as any)).rejects.toThrow()
      
      expect(getNewsletterById).not.toHaveBeenCalled()
    })
  })
})