import { describe, it, expect, vi, beforeEach } from 'vitest'
import { action, loader } from './preview'

// Mock the dependencies
vi.mock('~/business/admin/admin.server', () => ({
  getAdminContext: vi.fn().mockResolvedValue({ currentProfile: { id: 'admin-id' } })
}))

vi.mock('~/business/admin/newsletter/mdx-processor.server', () => ({
  processMDXContent: vi.fn()
}))

vi.mock('~/business/email/format-newsletter-mail', () => ({
  formatNewsletterMail: vi.fn()
}))

import { processMDXContent } from '~/business/admin/newsletter/mdx-processor.server'
import { formatNewsletterMail } from '~/business/email/format-newsletter-mail'

describe('Newsletter Preview API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loader', () => {
    it('should return method not allowed for GET requests', async () => {
      const response = await loader()
      const data = await response.json()
      
      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('action', () => {
    const mockRequest = (body: unknown) => ({
      json: vi.fn().mockResolvedValue(body),
      formData: vi.fn(),
      headers: new Headers()
    } as unknown as Request)

    const mockParams = {}

    it('should successfully generate preview for valid MDX content', async () => {
      const mockMDXHtml = '<h1>Test</h1>'
      const mockEmailHtml = '<html><body><h1>Test</h1></body></html>'
      
      vi.mocked(processMDXContent).mockResolvedValue({
        html: mockMDXHtml,
        text: 'Test'
      })
      
      vi.mocked(formatNewsletterMail).mockResolvedValue({
        html: mockEmailHtml,
        text: 'Test'
      })
      
      const request = mockRequest({
        content_mdx: '# Test',
        template_name: 'general-news'
      })
      
      const response = await action({ 
        request, 
        params: mockParams 
      })
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.html).toBe(mockEmailHtml)
      expect(processMDXContent).toHaveBeenCalledWith('# Test')
      expect(formatNewsletterMail).toHaveBeenCalledWith({
        subject: 'Preview',
        content: mockMDXHtml,
        template: 'general-news',
        unsubscribeUrl: '#'
      })
    })

    it('should return error when content_mdx is missing', async () => {
      const request = mockRequest({
        template_name: 'general-news'
      })
      
      const response = await action({ 
        request, 
        params: mockParams 
      })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('MDX content is required')
    })

    it('should return error when template_name is invalid', async () => {
      const request = mockRequest({
        content_mdx: '# Test',
        template_name: 'invalid-template'
      })
      
      const response = await action({ 
        request, 
        params: mockParams 
      })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Valid template name is required')
    })

    it('should handle MDX parsing errors with line numbers', async () => {
      vi.mocked(processMDXContent).mockRejectedValue(
        new Error('Could not parse at line 5: Expected closing tag')
      )
      
      const request = mockRequest({
        content_mdx: '# Test\n<div>unclosed',
        template_name: 'general-news'
      })
      
      const response = await action({ 
        request, 
        params: mockParams 
      })
      const data = await response.json()
      
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Invalid MDX syntax')
      expect(data.error.line).toBe(5)
    })

    it('should handle security errors', async () => {
      vi.mocked(processMDXContent).mockRejectedValue(
        new Error('JavaScript expressions are not allowed in newsletter content for security reasons')
      )
      
      const request = mockRequest({
        content_mdx: '# Test\n{console.log("hack")}',
        template_name: 'general-news'
      })
      
      const response = await action({ 
        request, 
        params: mockParams 
      })
      const data = await response.json()
      
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('JavaScript expressions are not allowed in newsletter content for security reasons')
    })

    it('should handle unknown component errors', async () => {
      vi.mocked(processMDXContent).mockRejectedValue(
        new Error('Expected component `UnknownComponent` to be defined')
      )
      
      const request = mockRequest({
        content_mdx: '<UnknownComponent />',
        template_name: 'event-announcement'
      })
      
      const response = await action({ 
        request, 
        params: mockParams 
      })
      const data = await response.json()
      
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Unknown component: UnknownComponent. Available components: EventCard, Button, Divider, Quote')
    })

    it('should work with event-announcement template', async () => {
      vi.mocked(processMDXContent).mockResolvedValue({
        html: '<h1>Event</h1>',
        text: 'Event'
      })
      
      vi.mocked(formatNewsletterMail).mockResolvedValue({
        html: '<html><body>Event Email</body></html>',
        text: 'Event Email'
      })
      
      const request = mockRequest({
        content_mdx: '# Event',
        template_name: 'event-announcement'
      })
      
      const response = await action({ 
        request, 
        params: mockParams 
      })
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(formatNewsletterMail).toHaveBeenCalledWith({
        subject: 'Preview',
        content: '<h1>Event</h1>',
        template: 'event-announcement',
        unsubscribeUrl: '#'
      })
    })
  })
})