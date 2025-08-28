import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useLoaderData } from 'react-router'
import NewslettersPage from './index'

type Newsletter = {
  id: string
  subject: string
  template_name: string
  content_mdx: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  recipient_count: number
}

vi.mock('react-router', () => ({
  useLoaderData: vi.fn(),
  Link: ({ children, to, ...props }: { children: React.ReactNode, to: string }) => (
    <a href={to} {...props}>{children}</a>
  )
}))

vi.mock('~/components/organisms/tables/admin/newsletter-table', () => ({
  NewsletterTable: ({ newsletters }: { newsletters: Newsletter[] }) => (
    <div data-testid="newsletter-table">
      {newsletters.map(n => (
        <div key={n.id}>{n.subject}</div>
      ))}
    </div>
  )
}))

describe('NewslettersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display the newsletters page heading', () => {
    vi.mocked(useLoaderData).mockReturnValue({
      newsletters: []
    })

    render(<NewslettersPage />)
    
    expect(screen.getByText('Newsletters')).toBeInTheDocument()
  })

  it('should display create newsletter button', () => {
    vi.mocked(useLoaderData).mockReturnValue({
      newsletters: []
    })

    render(<NewslettersPage />)
    
    const createButtons = screen.getAllByRole('link', { name: /criar newsletter/i })
    expect(createButtons).toHaveLength(2) // One in header, one in empty state
    expect(createButtons[0]).toHaveAttribute('href', '/admin/newsletters/new')
    expect(createButtons[1]).toHaveAttribute('href', '/admin/newsletters/new')
  })

  it('should display empty state when no newsletters exist', () => {
    vi.mocked(useLoaderData).mockReturnValue({
      newsletters: []
    })

    render(<NewslettersPage />)
    
    expect(screen.getByText(/nenhuma newsletter encontrada/i)).toBeInTheDocument()
    expect(screen.getByText(/crie sua primeira newsletter/i)).toBeInTheDocument()
  })

  it('should display newsletter table when newsletters exist', () => {
    const mockNewsletters = [
      {
        id: '1',
        subject: 'Test Newsletter 1',
        template_name: 'general-news',
        content_mdx: '# Content 1',
        status: 'draft',
        scheduled_at: null,
        sent_at: null,
        created_by: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        recipient_count: 0
      },
      {
        id: '2',
        subject: 'Test Newsletter 2',
        template_name: 'event-announcement',
        content_mdx: '# Content 2',
        status: 'sent',
        scheduled_at: null,
        sent_at: '2025-01-02T00:00:00Z',
        created_by: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        recipient_count: 150
      }
    ]

    vi.mocked(useLoaderData).mockReturnValue({
      newsletters: mockNewsletters
    })

    render(<NewslettersPage />)
    
    expect(screen.getByTestId('newsletter-table')).toBeInTheDocument()
    expect(screen.getByText('Test Newsletter 1')).toBeInTheDocument()
    expect(screen.getByText('Test Newsletter 2')).toBeInTheDocument()
  })

  it('should show statistics summary when newsletters exist', () => {
    const mockNewsletters = [
      {
        id: '1',
        subject: 'Newsletter 1',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'sent',
        scheduled_at: null,
        sent_at: '2025-01-01T00:00:00Z',
        created_by: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        recipient_count: 100
      },
      {
        id: '2',
        subject: 'Newsletter 2',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'sent',
        scheduled_at: null,
        sent_at: '2025-01-02T00:00:00Z',
        created_by: 'user-1',
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        recipient_count: 150
      },
      {
        id: '3',
        subject: 'Newsletter 3',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'draft',
        scheduled_at: null,
        sent_at: null,
        created_by: 'user-1',
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z',
        recipient_count: 0
      }
    ]

    vi.mocked(useLoaderData).mockReturnValue({
      newsletters: mockNewsletters
    })

    render(<NewslettersPage />)
    
    // Check statistics
    expect(screen.getByText('3')).toBeInTheDocument() // Total newsletters
    expect(screen.getByText('Total de Newsletters')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Sent newsletters
    expect(screen.getByText('Enviadas')).toBeInTheDocument()
    expect(screen.getByText('250')).toBeInTheDocument() // Total recipients
    expect(screen.getByText('Total de Destinatários')).toBeInTheDocument()
  })
})