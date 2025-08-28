import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NewsletterForm } from './newsletter-form'

// Mock useNavigation hook
vi.mock('react-router', () => ({
  useNavigation: () => ({ state: 'idle' }),
}))

vi.mock('~/lib/helpers/db-values-to-form-schema', () => ({
  dbValuesToFormSchema: (data: unknown) => data,
}))

// Mock the SchemaForm component to avoid React Router dependencies
vi.mock('../base/schema-form', () => ({
  SchemaForm: ({ values, labels, options, placeholders, buttonLabel, inputTypes }: {
    values?: Record<string, unknown>
    labels?: Record<string, string>
    options?: Record<string, Array<{ value: string, name: string }>>
    placeholders?: Record<string, string>
    buttonLabel?: string
    inputTypes?: Record<string, string>
  }) => {
    return (
      <form>
        {/* Subject field */}
        <div>
          <label htmlFor="subject">{labels?.subject || 'Subject'}</label>
          <input
            id="subject"
            name="subject"
            type="text"
            defaultValue={(values?.subject as string) || ''}
            placeholder={placeholders?.subject}
          />
        </div>
        
        {/* Template field */}
        <div>
          <label htmlFor="template_name">{labels?.template_name || 'Template'}</label>
          <select
            id="template_name"
            name="template_name"
            value={(values?.template_name as string) || ''}
            onChange={() => {}}
          >
            <option value="">Select a template</option>
            {options?.template_name?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Content field */}
        <div>
          <label htmlFor="content_mdx">{labels?.content_mdx || 'Content'}</label>
          <textarea
            id="content_mdx"
            name="content_mdx"
            defaultValue={(values?.content_mdx as string) || ''}
            placeholder={placeholders?.content_mdx}
          />
        </div>
        
        {/* Schedule field */}
        <div>
          <label htmlFor="scheduled_at">{labels?.scheduled_at || 'Schedule'}</label>
          <input
            id="scheduled_at"
            name="scheduled_at"
            type="datetime-local"
            defaultValue={(values?.scheduled_at as string) || ''}
          />
        </div>
        
        {/* Segment type field */}
        {inputTypes?.segment_type === 'select' && (
          <div>
            <label htmlFor="segment_type">{labels?.segment_type || 'Audience Segment'}</label>
            <select
              id="segment_type"
              name="segment_type"
              defaultValue={(values?.segment_type as string) || 'all'}
            >
              {options?.segment_type?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Exclude rejected checkbox */}
        <div>
          <label htmlFor="exclude_rejected">
            <input
              id="exclude_rejected"
              name="exclude_rejected"
              type="checkbox"
              defaultChecked={(values?.exclude_rejected as boolean) ?? true}
            />
            {labels?.exclude_rejected || 'Exclude rejected participants'}
          </label>
        </div>
        
        {/* Submit button */}
        <button type="submit">{buttonLabel || 'Submit'}</button>
      </form>
    )
  }
}))


describe('NewsletterForm', () => {
  const renderForm = (
    newsletter?: Parameters<typeof NewsletterForm>[0]['newsletter'],
    onSendNow?: Parameters<typeof NewsletterForm>[0]['onSendNow']
  ) => {
    return render(<NewsletterForm newsletter={newsletter} onSendNow={onSendNow} />)
  }

  describe('rendering', () => {
    it('should render all required form fields', () => {
      renderForm()
      
      expect(screen.getByLabelText(/assunto/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/conteúdo/i)).toBeInTheDocument()
    })

    it('should render scheduled_at field', () => {
      renderForm()
      
      expect(screen.getByLabelText(/agendar/i)).toBeInTheDocument()
    })

    it('should show correct template options in dropdown', () => {
      renderForm()
      
      const templateSelect = screen.getByLabelText(/modelo/i)
      expect(templateSelect).toBeInTheDocument()
      
      // Check that it's a select element
      expect(templateSelect.tagName).toBe('SELECT')
      
      // Check options are present
      const options = templateSelect.querySelectorAll('option')
      const optionValues = Array.from(options).map(opt => opt.value)
      
      expect(optionValues).toContain('general-news')
      expect(optionValues).toContain('event-announcement')
    })

    it('should render submit button', () => {
      renderForm()
      
      const submitButton = screen.getByRole('button', { name: /criar|atualizar|processar/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should render content field as textarea', () => {
      renderForm()
      
      const contentField = screen.getByLabelText(/conteúdo/i)
      expect(contentField.tagName).toBe('TEXTAREA')
    })
  })

  describe('with existing newsletter', () => {
    const existingNewsletter = {
      id: '123',
      subject: 'Test Newsletter',
      template_name: 'event-announcement',
      content_mdx: '# Test Content\n\nThis is a test.',
      scheduled_at: '2025-12-25T10:00:00',
      status: 'draft',
    }

    it('should pre-fill form with existing newsletter data', () => {
      renderForm(existingNewsletter)
      
      expect(screen.getByDisplayValue('Test Newsletter')).toBeInTheDocument()
      // For select elements, check if the option is selected
      const templateSelect = screen.getByLabelText(/modelo/i) as HTMLSelectElement
      expect(templateSelect.value).toBe('event-announcement')
      expect(screen.getByDisplayValue(/Test Content/)).toBeInTheDocument()
    })

    it('should show edit mode in submit button', () => {
      renderForm(existingNewsletter)
      
      const submitButton = screen.getByRole('button', { name: /atualizar|salvar/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('form labels', () => {
    it('should have proper labels for all fields', () => {
      renderForm()
      
      expect(screen.getByLabelText(/assunto/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/conteúdo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/agendar/i)).toBeInTheDocument()
    })
  })

  describe('Segment Type', () => {
    it('should render segment type dropdown in the form', () => {
      renderForm()
      
      const segmentSelect = screen.getByLabelText(/segmento de público/i)
      expect(segmentSelect).toBeInTheDocument()
      expect(segmentSelect.tagName).toBe('SELECT')
    })
    
    it('should have all segment options', () => {
      renderForm()
      
      const segmentSelect = screen.getByLabelText(/segmento de público/i)
      const options = segmentSelect.querySelectorAll('option')
      const optionValues = Array.from(options).map(opt => opt.value)
      
      expect(optionValues).toContain('all')
      expect(optionValues).toContain('veterans')
      expect(optionValues).toContain('newbies')
    })
  })
  
  describe('Exclude Rejected', () => {
    it('should render exclude rejected checkbox', () => {
      renderForm()
      
      const checkbox = screen.getByLabelText(/excluir.*rejeitados/i)
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).toHaveAttribute('type', 'checkbox')
    })
  })

  describe('Send Now button', () => {
    it('should render Send Now button for draft newsletters', () => {
      const mockOnSendNow = vi.fn()
      const draftNewsletter = {
        id: '123',
        subject: 'Draft Newsletter',
        template_name: 'general-news',
        content_mdx: '# Draft Content',
        status: 'draft',
      }
      
      renderForm(draftNewsletter, mockOnSendNow)
      
      const sendNowButton = screen.getByRole('button', { name: /enviar agora/i })
      expect(sendNowButton).toBeInTheDocument()
    })

    it('should not render Send Now button for new newsletters', () => {
      renderForm()
      
      const sendNowButton = screen.queryByRole('button', { name: /enviar agora/i })
      expect(sendNowButton).not.toBeInTheDocument()
    })

    it('should not render Send Now button for scheduled newsletters', () => {
      const scheduledNewsletter = {
        id: '123',
        subject: 'Scheduled Newsletter',
        template_name: 'general-news',
        content_mdx: '# Content',
        status: 'scheduled',
        scheduled_at: '2025-12-25T10:00:00',
      }
      
      renderForm(scheduledNewsletter)
      
      const sendNowButton = screen.queryByRole('button', { name: /enviar agora/i })
      expect(sendNowButton).not.toBeInTheDocument()
    })

    it('should call onSendNow callback when Send Now is clicked', () => {
      const mockOnSendNow = vi.fn()
      const draftNewsletter = {
        id: '123',
        subject: 'Draft Newsletter',
        template_name: 'general-news',
        content_mdx: '# Draft Content',
        status: 'draft',
      }
      
      render(<NewsletterForm newsletter={draftNewsletter} onSendNow={mockOnSendNow} />)
      
      const sendNowButton = screen.getByRole('button', { name: /enviar agora/i })
      sendNowButton.click()
      
      expect(mockOnSendNow).toHaveBeenCalledWith('123')
    })
  })
})