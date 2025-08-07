import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NewsletterForm } from './newsletter-form'

vi.mock('~/lib/helpers/db-values-to-form-schema', () => ({
  dbValuesToFormSchema: (data: unknown) => data,
}))

// Mock the SchemaForm component to avoid React Router dependencies
vi.mock('../base/schema-form', () => ({
  SchemaForm: ({ children, values, labels, options, placeholders }: {
    children?: (props: {
      Button: React.FC<{ children: React.ReactNode }>
    }) => React.ReactNode
    values?: Record<string, unknown>
    labels?: Record<string, string>
    options?: Record<string, Array<{ value: string, label: string }>>
    placeholders?: Record<string, string>
  }) => {
    const Button = ({ children: btnChildren }: { children: React.ReactNode }) => (
      <button type="submit">{btnChildren}</button>
    )
    
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
                {opt.label}
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
        
        {children && children({ Button })}
      </form>
    )
  }
}))

describe('NewsletterForm', () => {
  const renderForm = (newsletter?: Parameters<typeof NewsletterForm>[0]['newsletter']) => {
    return render(<NewsletterForm newsletter={newsletter} />)
  }

  describe('rendering', () => {
    it('should render all required form fields', () => {
      renderForm()
      
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/template/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/content/i)).toBeInTheDocument()
    })

    it('should render scheduled_at field', () => {
      renderForm()
      
      expect(screen.getByLabelText(/schedule/i)).toBeInTheDocument()
    })

    it('should show correct template options in dropdown', () => {
      renderForm()
      
      const templateSelect = screen.getByLabelText(/template/i)
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
      
      const submitButton = screen.getByRole('button', { name: /save|submit|create/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should render content field as textarea', () => {
      renderForm()
      
      const contentField = screen.getByLabelText(/content/i)
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
      const templateSelect = screen.getByLabelText(/template/i) as HTMLSelectElement
      expect(templateSelect.value).toBe('event-announcement')
      expect(screen.getByDisplayValue(/Test Content/)).toBeInTheDocument()
    })

    it('should show edit mode in submit button', () => {
      renderForm(existingNewsletter)
      
      const submitButton = screen.getByRole('button', { name: /update|save/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('form labels', () => {
    it('should have proper labels for all fields', () => {
      renderForm()
      
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/template/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/content/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/schedule/i)).toBeInTheDocument()
    })
  })
})