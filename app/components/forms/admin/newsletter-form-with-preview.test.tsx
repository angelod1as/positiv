import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { NewsletterFormWithPreview } from './newsletter-form-with-preview'
import { BrowserRouter } from 'react-router'

// Mock dependencies
vi.mock('~/components/organisms/newsletter/mdx-components-docs', () => ({
  MDXComponentsDocs: () => <div>MDX Docs</div>
}))

vi.mock('~/components/organisms/newsletter/newsletter-editor-with-preview', () => ({
  NewsletterEditorWithPreview: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      data-testid="content-mdx"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigation: () => ({ state: 'idle' }),
    Form: ({ children, ...props }: React.PropsWithChildren<React.FormHTMLAttributes<HTMLFormElement>>) => (
      <form {...props}>{children}</form>
    ),
  }
})

describe('NewsletterFormWithPreview', () => {
  describe('Template Dropdown', () => {
    it('should default to "general-news" template', () => {
      render(
        <BrowserRouter>
          <NewsletterFormWithPreview />
        </BrowserRouter>
      )

      // Check the hidden select element that mirrors the ShadCN Select
      const hiddenSelect = document.querySelector('select[name="template_name"]') as HTMLSelectElement
      expect(hiddenSelect).toBeTruthy()
      expect(hiddenSelect.value).toBe('general-news')

      // Check the hidden input used for form submission
      const hiddenInput = document.querySelector('input[type="hidden"][name="template_name"]') as HTMLInputElement
      expect(hiddenInput).toBeTruthy()
      expect(hiddenInput.value).toBe('general-news')
    })

    it('should have the correct template options', () => {
      render(
        <BrowserRouter>
          <NewsletterFormWithPreview />
        </BrowserRouter>
      )

      const hiddenSelect = document.querySelector('select[name="template_name"]') as HTMLSelectElement
      expect(hiddenSelect).toBeTruthy()

      const options = Array.from(hiddenSelect.options)
      const optionValues = options.map(opt => opt.value)
      const optionTexts = options.map(opt => opt.text)

      expect(optionValues).toEqual(['general-news', 'event-announcement'])
      expect(optionTexts).toEqual(['Notícias Gerais', 'Anúncio de Evento'])
    })
  })

  describe('Segment Dropdown', () => {
    it('should have the correct segment options matching database', () => {
      render(
        <BrowserRouter>
          <NewsletterFormWithPreview />
        </BrowserRouter>
      )

      // Check for the visible select element (for E2E tests)
      const hiddenSelect = document.querySelector('select[name="segment_type"]') as HTMLSelectElement
      expect(hiddenSelect).toBeTruthy()

      const options = Array.from(hiddenSelect.options)
      const optionValues = options.map(opt => opt.value)
      const optionTexts = options.map(opt => opt.text)

      // Verify the correct segment keys
      expect(optionValues).toEqual([
        'all',
        'admins',
        'veterans',
        'newbies',
        'new_registrations_30d',
        'applied_never_attended'
      ])

      // Verify the correct labels match the table descriptions
      expect(optionTexts).toEqual([
        'Todos os inscritos',
        'Administradores',
        'Veteranos',
        'Novatos',
        'Novos cadastros',
        'Novatos (nunca participou)'
      ])
    })

    it('should not have outdated segment options', () => {
      render(
        <BrowserRouter>
          <NewsletterFormWithPreview />
        </BrowserRouter>
      )

      const hiddenSelect = document.querySelector('select[name="segment_type"]') as HTMLSelectElement
      const options = Array.from(hiddenSelect.options)
      const optionValues = options.map(opt => opt.value)

      // These should NOT exist
      expect(optionValues).not.toContain('never_attended')
      expect(optionValues).not.toContain('has_attended')
      expect(optionValues).not.toContain('never_applied')
    })

    it('should default to "all" segment', () => {
      render(
        <BrowserRouter>
          <NewsletterFormWithPreview />
        </BrowserRouter>
      )

      const hiddenInput = document.querySelector('input[type="hidden"][name="segment_type"]') as HTMLInputElement
      expect(hiddenInput.value).toBe('all')
    })
  })
})