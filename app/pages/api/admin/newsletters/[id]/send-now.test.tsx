import { describe, expect, it, vi, beforeEach } from 'vitest'
import { action } from './send-now'
import { sendNewsletterNow } from '~/business/admin/newsletter/newsletter.server'
import { getAdminContext } from '~/business/admin/admin.server'
import type { ActionFunctionArgs } from 'react-router'

// Mock dependencies
vi.mock('~/business/admin/admin.server', () => ({
  getAdminContext: vi.fn(),
}))

vi.mock('~/business/admin/newsletter/newsletter.server', () => ({
  sendNewsletterNow: vi.fn(),
}))

describe('Send Newsletter Now API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('action', () => {
    it('should send newsletter immediately and return statistics', async () => {
      const mockContext = { userId: 'admin-user-id' }
      const mockResult = {
        success: true,
        processed: 10,
        failed: 0,
        newsletterId: 'newsletter-123',
      }
      
      vi.mocked(getAdminContext).mockResolvedValue(mockContext)
      vi.mocked(sendNewsletterNow).mockResolvedValue(mockResult)

      const request = new Request('http://localhost:3000/api/admin/newsletters/newsletter-123/send-now', {
        method: 'POST',
      })
      
      const response = await action({
        request,
        params: { id: 'newsletter-123' },
      } as ActionFunctionArgs)
      
      expect(sendNewsletterNow).toHaveBeenCalledWith('newsletter-123')
      
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        processed: 10,
        failed: 0,
        newsletterId: 'newsletter-123',
      })
    })

    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(getAdminContext).mockRejectedValue(
        new Response(null, { status: 401 })
      )

      const request = new Request('http://localhost:3000/api/admin/newsletters/newsletter-123/send-now', {
        method: 'POST',
      })
      
      await expect(action({
        request,
        params: { id: 'newsletter-123' },
      } as ActionFunctionArgs)).rejects.toThrow()
      
      expect(sendNewsletterNow).not.toHaveBeenCalled()
    })

    it('should return 400 if newsletter ID is missing', async () => {
      const mockContext = { userId: 'admin-user-id' }
      vi.mocked(getAdminContext).mockResolvedValue(mockContext)

      const request = new Request('http://localhost:3000/api/admin/newsletters/send-now', {
        method: 'POST',
      })
      
      const response = await action({
        request,
        params: {},
      } as ActionFunctionArgs)
      
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Newsletter ID is required',
      })
      
      expect(sendNewsletterNow).not.toHaveBeenCalled()
    })

    it('should handle errors from sendNewsletterNow', async () => {
      const mockContext = { userId: 'admin-user-id' }
      vi.mocked(getAdminContext).mockResolvedValue(mockContext)
      vi.mocked(sendNewsletterNow).mockRejectedValue(
        new Error('Newsletter not found')
      )

      const request = new Request('http://localhost:3000/api/admin/newsletters/newsletter-123/send-now', {
        method: 'POST',
      })
      
      const response = await action({
        request,
        params: { id: 'newsletter-123' },
      } as ActionFunctionArgs)
      
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Newsletter not found',
      })
    })

    it('should handle timeout for large recipient lists', async () => {
      const mockContext = { userId: 'admin-user-id' }
      const mockResult = {
        success: true,
        processed: 500,
        failed: 5,
        newsletterId: 'newsletter-123',
      }
      
      vi.mocked(getAdminContext).mockResolvedValue(mockContext)
      vi.mocked(sendNewsletterNow).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResult), 100))
      )

      const request = new Request('http://localhost:3000/api/admin/newsletters/newsletter-123/send-now', {
        method: 'POST',
      })
      
      const response = await action({
        request,
        params: { id: 'newsletter-123' },
      } as ActionFunctionArgs)
      
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(500)
    })
  })
})