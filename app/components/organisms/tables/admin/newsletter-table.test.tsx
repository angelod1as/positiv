import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NewsletterTable } from './newsletter-table'
import { format } from 'date-fns'

vi.mock('react-router', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode, to: string }) => (
    <a href={to} {...props}>{children}</a>
  )
}))

describe('NewsletterTable', () => {
  const mockNewsletters = [
    {
      id: '1',
      subject: 'First Newsletter',
      template_name: 'general-news',
      content_mdx: '# Content 1',
      status: 'draft' as const,
      scheduled_at: null,
      sent_at: null,
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      recipient_count: 0
    },
    {
      id: '2',
      subject: 'Second Newsletter',
      template_name: 'event-announcement',
      content_mdx: '# Content 2',
      status: 'sent' as const,
      scheduled_at: null,
      sent_at: '2025-01-02T10:00:00Z',
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      recipient_count: 150
    },
    {
      id: '3',
      subject: 'Scheduled Newsletter',
      template_name: 'general-news',
      content_mdx: '# Content 3',
      status: 'scheduled' as const,
      scheduled_at: '2025-01-10T15:00:00Z',
      sent_at: null,
      created_by: 'user-1',
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-03T00:00:00Z',
      recipient_count: 0
    }
  ]

  it('should render table headers', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    expect(screen.getByText('Subject')).toBeInTheDocument()
    expect(screen.getByText('Template')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Recipients')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('should render newsletter rows', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    expect(screen.getByText('First Newsletter')).toBeInTheDocument()
    expect(screen.getByText('Second Newsletter')).toBeInTheDocument()
    expect(screen.getByText('Scheduled Newsletter')).toBeInTheDocument()
  })

  it('should display template names correctly', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    // We have 2 newsletters with "General News" template
    const generalNewsElements = screen.getAllByText('General News')
    expect(generalNewsElements).toHaveLength(2)
    
    // We have 1 newsletter with "Event Announcement" template
    const eventAnnouncementElements = screen.getAllByText('Event Announcement')
    expect(eventAnnouncementElements).toHaveLength(1)
  })

  it('should display status badges correctly', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    const draftBadge = screen.getByText('Draft')
    const sentBadge = screen.getByText('Sent')
    const scheduledBadge = screen.getByText('Scheduled')
    
    expect(draftBadge).toBeInTheDocument()
    expect(sentBadge).toBeInTheDocument()
    expect(scheduledBadge).toBeInTheDocument()
  })

  it('should display recipient counts', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    // First and third newsletters have 0 recipients (shown as "-")
    const dashElements = screen.getAllByText('-')
    expect(dashElements).toHaveLength(2)
    
    // Second newsletter has 150 recipients
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('should display dates correctly', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    // For sent newsletter, should show sent date
    const sentDate = format(new Date('2025-01-02T10:00:00Z'), 'MMM d, yyyy h:mm a')
    expect(screen.getByText(sentDate)).toBeInTheDocument()
    
    // For scheduled newsletter, should show scheduled date
    const scheduledDate = format(new Date('2025-01-10T15:00:00Z'), 'MMM d, yyyy h:mm a')
    expect(screen.getByText(scheduledDate)).toBeInTheDocument()
    
    // For draft, should show created date
    const draftDate = format(new Date('2025-01-01T00:00:00Z'), 'MMM d, yyyy h:mm a')
    expect(screen.getByText(draftDate)).toBeInTheDocument()
  })

  it('should render action buttons', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    // Should have view buttons for all newsletters
    const viewButtons = screen.getAllByText('View')
    expect(viewButtons).toHaveLength(3)
    
    // Should have edit button only for draft newsletter
    const editButtons = screen.getAllByText('Edit')
    expect(editButtons).toHaveLength(1)
  })

  it('should link to correct pages', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    // Check view links
    const viewLinks = screen.getAllByRole('link', { name: /view/i })
    expect(viewLinks[0]).toHaveAttribute('href', '/admin/newsletters/1')
    expect(viewLinks[1]).toHaveAttribute('href', '/admin/newsletters/2')
    expect(viewLinks[2]).toHaveAttribute('href', '/admin/newsletters/3')
    
    // Check edit link (only for draft)
    const editLink = screen.getByRole('link', { name: /edit/i })
    expect(editLink).toHaveAttribute('href', '/admin/newsletters/1/edit')
  })

  it('should handle empty newsletter list', () => {
    render(<NewsletterTable newsletters={[]} />)
    
    expect(screen.getByText('No newsletters found')).toBeInTheDocument()
  })
})