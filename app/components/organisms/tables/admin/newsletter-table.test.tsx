import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { NewsletterTable } from './newsletter-table'
import { formatDateTime } from '~/lib/helpers/format-date-time'

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
    
    expect(screen.getByText('Assunto')).toBeInTheDocument()
    expect(screen.getByText('Modelo')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Destinatários')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
  })

  it('should render newsletter rows', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    expect(screen.getByText('First Newsletter')).toBeInTheDocument()
    expect(screen.getByText('Second Newsletter')).toBeInTheDocument()
    expect(screen.getByText('Scheduled Newsletter')).toBeInTheDocument()
  })

  it('should display template names correctly', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    // We have 2 newsletters with "Notícias Gerais" template
    const generalNewsElements = screen.getAllByText('Notícias Gerais')
    expect(generalNewsElements).toHaveLength(2)
    
    // We have 1 newsletter with "Anúncio de Evento" template
    const eventAnnouncementElements = screen.getAllByText('Anúncio de Evento')
    expect(eventAnnouncementElements).toHaveLength(1)
  })

  it('should display status badges correctly', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    const draftBadge = screen.getByText('Rascunho')
    const sentBadge = screen.getByText('Enviada')
    const scheduledBadge = screen.getByText('Agendada')
    
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
    const sentDate = formatDateTime('2025-01-02T10:00:00Z', 'short').full
    if (sentDate) {
      expect(screen.getByText(sentDate)).toBeInTheDocument()
    }

    // For scheduled newsletter, should show scheduled date
    const scheduledDate = formatDateTime('2025-01-10T15:00:00Z', 'short').full
    if (scheduledDate) {
      expect(screen.getByText(scheduledDate)).toBeInTheDocument()
    }

    // For draft, should show created date
    const draftDate = formatDateTime('2025-01-01T00:00:00Z', 'short').full
    if (draftDate) {
      expect(screen.getByText(draftDate)).toBeInTheDocument()
    }
  })

  it('should render action buttons', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    // Should have view buttons for all newsletters
    const viewButtons = screen.getAllByLabelText('Visualizar')
    expect(viewButtons).toHaveLength(3)
    
    // Should have edit button only for draft newsletter
    const editButtons = screen.getAllByLabelText('Editar')
    expect(editButtons).toHaveLength(1)
  })

  it('should link to correct pages', () => {
    render(<NewsletterTable newsletters={mockNewsletters} />)
    
    // Check view links
    const viewLinks = screen.getAllByLabelText('Visualizar').map(btn => btn.closest('a'))
    expect(viewLinks[0]).toHaveAttribute('href', '/admin/newsletters/1')
    expect(viewLinks[1]).toHaveAttribute('href', '/admin/newsletters/2')
    expect(viewLinks[2]).toHaveAttribute('href', '/admin/newsletters/3')
    
    // Check edit link (only for draft)
    const editButton = screen.getByLabelText('Editar')
    const editLink = editButton.closest('a')
    expect(editLink).toHaveAttribute('href', '/admin/newsletters/1/edit')
  })

  it('should handle empty newsletter list', () => {
    render(<NewsletterTable newsletters={[]} />)
    
    expect(screen.getByText('Nenhuma newsletter encontrada')).toBeInTheDocument()
  })

  it('should show delete button only for draft and scheduled newsletters', () => {
    const mockOnDelete = vi.fn()
    render(<NewsletterTable newsletters={mockNewsletters} onDelete={mockOnDelete} />)
    
    // Should have delete buttons only for draft (id: 1) and scheduled (id: 3) newsletters
    const deleteButtons = screen.getAllByLabelText('Excluir')
    expect(deleteButtons).toHaveLength(2)
    
    // Should not have delete button for sent newsletter (id: 2)
    // We can verify this by checking that we only have 2 delete buttons, not 3
  })

  it('should call onDelete with correct id when delete button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnDelete = vi.fn()
    render(<NewsletterTable newsletters={mockNewsletters} onDelete={mockOnDelete} />)
    
    // Click the first delete button (for draft newsletter with id: 1)
    const deleteButtons = screen.getAllByLabelText('Excluir')
    await user.click(deleteButtons[0])
    
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('should call onDelete for scheduled newsletter', async () => {
    const user = userEvent.setup()
    const mockOnDelete = vi.fn()
    render(<NewsletterTable newsletters={mockNewsletters} onDelete={mockOnDelete} />)
    
    // Click the second delete button (for scheduled newsletter with id: 3)
    const deleteButtons = screen.getAllByLabelText('Excluir')
    await user.click(deleteButtons[1])
    
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith('3')
  })

  it('should not show delete button for sent newsletters', () => {
    const mockOnDelete = vi.fn()
    const sentNewsletters = [
      {
        id: '1',
        subject: 'Sent Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'sent' as const,
        scheduled_at: null,
        sent_at: '2025-01-02T10:00:00Z',
        created_by: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T10:00:00Z',
        recipient_count: 150
      }
    ]
    
    render(<NewsletterTable newsletters={sentNewsletters} onDelete={mockOnDelete} />)
    
    // Should not have any delete buttons
    const deleteButtons = screen.queryAllByLabelText('Excluir')
    expect(deleteButtons).toHaveLength(0)
  })
})