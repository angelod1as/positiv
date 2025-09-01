/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { loader, action } from './view'
import { getNewsletterById, sendNewsletterNow } from '~/business/admin/newsletter/newsletter.server'
import { redirectWithSuccess } from 'remix-toast'

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
  sendNewsletterNow: vi.fn(),
}))

vi.mock('~/business/admin/newsletter/delete-newsletter.server', () => ({
  deleteNewsletter: vi.fn(),
}))

vi.mock('~/business/admin/newsletter/newsletter-scheduler.server', () => ({
  processScheduledNewsletters: vi.fn(),
}))

vi.mock('~/lib/supabase/db.server', () => ({
  db: {},
}))

vi.mock('remix-toast', () => ({
  redirectWithToast: vi.fn((path, _toast) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
  redirectWithSuccess: vi.fn((path, _message) => {
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
      mockGetNewsletterById.mockResolvedValue(undefined)
      
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

  describe('action', () => {
    describe('send-now intent', () => {
      it('should send newsletter immediately when intent is send-now', async () => {
        const mockSendNewsletterNow = vi.mocked(sendNewsletterNow)
        const mockRedirectWithSuccess = vi.mocked(redirectWithSuccess)
        
        mockSendNewsletterNow.mockResolvedValue({
          success: true,
          processed: 50,
          failed: 0,
          newsletterId: 'newsletter-123',
        })
        
        const formData = new FormData()
        formData.append('intent', 'send-now')
        
        const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123', {
          method: 'POST',
          body: formData,
        })
        
        await expect(action({ 
          request, 
          params: { id: 'newsletter-123' }
        } as any)).rejects.toThrow()
        
        expect(mockSendNewsletterNow).toHaveBeenCalledWith('newsletter-123')
        expect(mockRedirectWithSuccess).toHaveBeenCalledWith(
          '/admin/newsletters/newsletter-123',
          'Newsletter enviada com sucesso! 50 emails enviados.'
        )
      })
      
      it('should handle errors when sending newsletter fails', async () => {
        const mockSendNewsletterNow = vi.mocked(sendNewsletterNow)
        const error = new Error('Only draft newsletters can be sent immediately')
        mockSendNewsletterNow.mockRejectedValue(error)
        
        const formData = new FormData()
        formData.append('intent', 'send-now')
        
        const request = new Request('http://localhost:3000/admin/newsletters/newsletter-123', {
          method: 'POST',
          body: formData,
        })
        
        await expect(action({ 
          request, 
          params: { id: 'newsletter-123' }
        } as any)).rejects.toThrow()
        
        expect(mockSendNewsletterNow).toHaveBeenCalledWith('newsletter-123')
      })
      
      it('should require newsletter ID for send-now', async () => {
        const formData = new FormData()
        formData.append('intent', 'send-now')
        
        const request = new Request('http://localhost:3000/admin/newsletters/', {
          method: 'POST',
          body: formData,
        })
        
        await expect(action({ 
          request, 
          params: {}
        } as any)).rejects.toThrow()
        
        expect(sendNewsletterNow).not.toHaveBeenCalled()
      })
    })
  })
})