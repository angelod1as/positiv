import { describe, expect, it, vi, beforeEach } from 'vitest'
import { loader, action } from './new'
import { createNewsletter } from '~/business/admin/newsletter/newsletter.server'
import type { Route } from './+types/new'

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
  getAdminContext: vi.fn().mockResolvedValue({ 
    currentProfile: { id: 'test-profile-id' },
    currentUser: { id: 'test-user-id' }
  }),
}))

vi.mock('~/business/admin/newsletter/newsletter.server', () => ({
  createNewsletter: vi.fn(),
}))

vi.mock('~/business/admin/newsletter/newsletter-segments.server', () => ({
  getSegmentDescriptions: vi.fn().mockResolvedValue([
    {
      segment_key: 'all',
      segment_name: 'Todos os inscritos',
      description: 'Todos que permitiram receber emails de marketing',
      count: 150,
      updated_at: new Date().toISOString()
    },
    {
      segment_key: 'veterans',
      segment_name: 'Veteranos',
      description: 'Já participou de algum evento',
      count: 75,
      updated_at: new Date().toISOString()
    }
  ])
}))

vi.mock('remix-forms', () => ({
  formAction: vi.fn(async (config) => {
    const clonedRequest = config.request.clone()
    const formData = await clonedRequest.formData()
    const data = Object.fromEntries(formData)
    const context = config.context || (await config.contextFactory?.({ request: config.request }))
    
    // Call the mutation with the data and context
    const result = await config.mutation(data, context)
    
    if (config.transformResult) {
      return config.transformResult(result)
    }
    return result
  }),
  applySchema: vi.fn((_schema, _contextSchema) => {
    // Return the mutation function directly
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
}))

describe('New Newsletter Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loader', () => {
    it('should return admin context and segment descriptions', async () => {
      const request = new Request('http://localhost:3000/admin/newsletters/new')
      const result = await loader({ request, params: {} } as Route.LoaderArgs)
      
      expect(result).toEqual({ 
        currentProfile: { id: 'test-profile-id' },
        currentUser: { id: 'test-user-id' },
        segments: [
          {
            segment_key: 'all',
            segment_name: 'Todos os inscritos',
            description: 'Todos que permitiram receber emails de marketing',
            count: 150,
            updated_at: expect.any(String)
          },
          {
            segment_key: 'veterans',
            segment_name: 'Veteranos',
            description: 'Já participou de algum evento',
            count: 75,
            updated_at: expect.any(String)
          }
        ]
      })
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
      
      const mockCreateNewsletter = vi.mocked(createNewsletter)
      mockCreateNewsletter.mockResolvedValue(mockNewsletter)
      
      const body = new URLSearchParams()
      body.append('subject', 'Test Newsletter')
      body.append('template_name', 'general-news')
      body.append('content_mdx', '# Test Content')
      
      const request = new Request('http://localhost:3000/admin/newsletters/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      
      try {
        await action({ request, params: {} } as Route.ActionArgs)
        // If we get here without throwing, fail the test
        expect.fail('Expected action to throw')
      } catch (error) {
        // Check if it's the redirect response we expect
        expect(error).toBeInstanceOf(Response)
        if (error instanceof Response) {
          expect(error.status).toBe(302)
        }
      }
      
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
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z',
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
      
      const mockCreateNewsletter = vi.mocked(createNewsletter)
      mockCreateNewsletter.mockResolvedValue(mockNewsletter)
      
      const body = new URLSearchParams()
      body.append('subject', 'Scheduled Newsletter')
      body.append('template_name', 'event-announcement')
      body.append('content_mdx', '# Event Content')
      body.append('scheduled_at', '2025-12-25T10:00:00')
      body.append('status', 'scheduled')
      
      const request = new Request('http://localhost:3000/admin/newsletters/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      
      await expect(action({ request, params: {} } as Route.ActionArgs)).rejects.toThrow()
      
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