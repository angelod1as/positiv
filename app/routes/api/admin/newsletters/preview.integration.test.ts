import { describe, it, expect } from 'vitest'
import { action } from './preview'
import { vi } from 'vitest'

// Mock the admin context to bypass authentication
vi.mock('~/business/admin/admin.server', () => ({
  getAdminContext: vi.fn().mockResolvedValue(undefined)
}))

describe('Newsletter Preview API - Error Handling', () => {
  it('should process simple markdown content successfully', async () => {
    const request = new Request('http://localhost:3000/api/admin/newsletters/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_mdx: '# Hello World\n\nThis is a test.',
        template_name: 'general-news'
      })
    })

    const response = await action({ request, params: {} })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.html).toContain('Hello World')
  })

  it('should return detailed error for invalid MDX syntax', async () => {
    const request = new Request('http://localhost:3000/api/admin/newsletters/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_mdx: '<Component', // Incomplete JSX
        template_name: 'general-news'
      })
    })

    const response = await action({ request, params: {} })
    const data = await response.json()

    expect(response.status).toBe(200) // Still 200 as it's a validation error
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
    expect(data.error.message).toBeDefined()
    expect(data.error.message).not.toBe('Failed to generate preview. Please try again.')
    // Should contain actual error details
    expect(data.error.message.toLowerCase()).toMatch(/invalid|syntax|parse|expected/i)
  })

  it('should return helpful error for unknown components', async () => {
    const request = new Request('http://localhost:3000/api/admin/newsletters/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_mdx: '<UnknownComponent />',
        template_name: 'general-news'
      })
    })

    const response = await action({ request, params: {} })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
    expect(data.error.message).toContain('UnknownComponent')
    expect(data.error.message).toMatch(/Available components|EventCard|Button|Divider|Quote/i)
  })

  it('should block JavaScript expressions and return security error', async () => {
    const request = new Request('http://localhost:3000/api/admin/newsletters/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_mdx: 'Hello {console.log("hack")} World',
        template_name: 'general-news'
      })
    })

    const response = await action({ request, params: {} })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
    expect(data.error.message).toContain('not allowed')
  })

  it('should include line number in error when available', async () => {
    const request = new Request('http://localhost:3000/api/admin/newsletters/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_mdx: `# Valid heading
        
Line 3 content
<InvalidTag
Line 5 content`, // Error on line 4
        template_name: 'general-news'
      })
    })

    const response = await action({ request, params: {} })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
    expect(data.error.line).toBeDefined()
    // Line should be either a number or null
    if (data.error.line !== null) {
      expect(typeof data.error.line).toBe('number')
    }
  })

  it('should handle empty content gracefully', async () => {
    const request = new Request('http://localhost:3000/api/admin/newsletters/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_mdx: '',
        template_name: 'general-news'
      })
    })

    const response = await action({ request, params: {} })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('MDX content is required')
  })

  it('should process markdown with special characters correctly', async () => {
    const request = new Request('http://localhost:3000/api/admin/newsletters/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_mdx: '# Angelo\'s Newsletter\n\n"Hello" & welcome!',
        template_name: 'general-news'
      })
    })

    const response = await action({ request, params: {} })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.html).toContain('Angelo')
    expect(data.html).toContain('welcome')
  })

  it('should log errors to console for debugging', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const request = new Request('http://localhost:3000/api/admin/newsletters/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_mdx: '<BrokenComponent', 
        template_name: 'general-news'
      })
    })

    await action({ request, params: {} })
    
    // Should log the MDX error details
    expect(consoleErrorSpy).toHaveBeenCalled()
    const errorCall = consoleErrorSpy.mock.calls[0]
    expect(errorCall[0]).toContain('MDX compilation error')
    
    consoleErrorSpy.mockRestore()
  })
})