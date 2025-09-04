import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import { NewsletterEditorWithPreview } from './newsletter-editor-with-preview'

// Mock the debounce hook to make it immediate in tests
vi.mock('~/lib/hooks/use-debounce', () => ({
  useDebounceFunction: (fn: (...args: unknown[]) => unknown, _delay: number) => fn
}))

// Mock fetch
global.fetch = vi.fn()

describe('NewsletterEditorWithPreview', () => {
  const mockOnChange = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render editor and preview panels', () => {
    render(
      <NewsletterEditorWithPreview
        value=""
        onChange={mockOnChange}
        templateName="general-news"
        placeholder="Enter content..."
      />
    )
    
    expect(screen.getByText('Editor')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter content...')).toBeInTheDocument()
    expect(screen.getByText('Start typing to see preview')).toBeInTheDocument()
  })
  
  it('should call onChange when typing', async () => {
    const user = userEvent.setup({ delay: null })
    
    const ControlledComponent = () => {
      const [value, setValue] = useState('')
      return (
        <NewsletterEditorWithPreview
          value={value}
          onChange={(newValue) => {
            setValue(newValue)
            mockOnChange(newValue)
          }}
          templateName="general-news"
        />
      )
    }
    
    render(<ControlledComponent />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test')
    
    // onChange is called for each character with accumulated value
    expect(mockOnChange).toHaveBeenCalledTimes(4)
    expect(mockOnChange).toHaveBeenNthCalledWith(1, 'T')
    expect(mockOnChange).toHaveBeenNthCalledWith(2, 'Te')
    expect(mockOnChange).toHaveBeenNthCalledWith(3, 'Tes')
    expect(mockOnChange).toHaveBeenNthCalledWith(4, 'Test')
  })
  
  it('should fetch and display preview when content changes', async () => {
    const mockHtml = '<html><body><h1>Hello</h1></body></html>'
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, html: mockHtml })
    } as Response)
    
    render(
      <NewsletterEditorWithPreview
        value="# Hello"
        onChange={mockOnChange}
        templateName="general-news"
      />
    )
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/newsletters/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_mdx: '# Hello',
          template_name: 'general-news'
        }),
        signal: expect.any(AbortSignal)
      })
    })
    
    await waitFor(() => {
      const iframe = screen.getByTitle('Newsletter Preview') as HTMLIFrameElement
      expect(iframe).toBeInTheDocument()
      expect(iframe.srcdoc).toBe(mockHtml)
    })
  })
  
  it('should display error when MDX parsing fails', async () => {
    const errorResponse = {
      success: false,
      error: {
        message: 'Invalid MDX syntax: Expected closing tag',
        line: 5
      }
    }
    
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => errorResponse
    } as Response)
    
    render(
      <NewsletterEditorWithPreview
        value="<div>unclosed"
        onChange={mockOnChange}
        templateName="general-news"
      />
    )
    
    await waitFor(() => {
      expect(screen.getByText('MDX Error')).toBeInTheDocument()
      expect(screen.getByText(/Line 5:/)).toBeInTheDocument()
      expect(screen.getByText(/Invalid MDX syntax: Expected closing tag/)).toBeInTheDocument()
      expect(screen.getByText('Fix the error to see preview')).toBeInTheDocument()
    })
  })
  
  it('should show loading state while fetching', async () => {
    let resolvePromise: ((value: Response) => void) | undefined
    const promise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    
    vi.mocked(fetch).mockReturnValue(promise)
    
    render(
      <NewsletterEditorWithPreview
        value="# Test"
        onChange={mockOnChange}
        templateName="general-news"
      />
    )
    
    await waitFor(() => {
      expect(screen.getByText('Generating preview...')).toBeInTheDocument()
    })
    
    if (resolvePromise) {
      resolvePromise({
        json: async () => ({ success: true, html: '<h1>Test</h1>' })
      } as Response)
    }
    
    await waitFor(() => {
      expect(screen.queryByText('Generating preview...')).not.toBeInTheDocument()
    })
  })
  
  it('should not fetch preview for empty content', async () => {
    render(
      <NewsletterEditorWithPreview
        value="   "
        onChange={mockOnChange}
        templateName="general-news"
      />
    )
    
    // Wait a bit to ensure no fetch is triggered
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Start typing to see preview')).toBeInTheDocument()
  })
  
  it('should update preview when template changes', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, html: '<h1>General</h1>' })
    } as Response)
    
    const { rerender } = render(
      <NewsletterEditorWithPreview
        value="# Test"
        onChange={mockOnChange}
        templateName="general-news"
      />
    )
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        body: JSON.stringify({
          content_mdx: '# Test',
          template_name: 'general-news'
        })
      }))
    })
    
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, html: '<h1>Event</h1>' })
    } as Response)
    
    rerender(
      <NewsletterEditorWithPreview
        value="# Test"
        onChange={mockOnChange}
        templateName="event-announcement"
      />
    )
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        body: JSON.stringify({
          content_mdx: '# Test',
          template_name: 'event-announcement'
        })
      }))
    })
  })
  
  it('should show live preview indicator when preview is ready', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, html: '<h1>Test</h1>' })
    } as Response)
    
    render(
      <NewsletterEditorWithPreview
        value="# Test"
        onChange={mockOnChange}
        templateName="general-news"
      />
    )
    
    await waitFor(() => {
      expect(screen.getByText('Live preview')).toBeInTheDocument()
    })
  })
})