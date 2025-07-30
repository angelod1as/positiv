import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from './confirm-dialog'

describe('ConfirmDialog', () => {
  it('should render React component description without HTML nesting errors', () => {
    // Mock console.error to catch HTML nesting warnings
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const TestDescription = () => (
      <div data-testid="custom-description">
        <h4>Custom Title</h4>
        <p>Custom content with multiple elements</p>
      </div>
    )
    
    render(
      <ConfirmDialog
        title="Test Dialog"
        description={<TestDescription />}
        confirmLabel="Confirm"
      >
        <ConfirmDialog.Trigger>Open Dialog</ConfirmDialog.Trigger>
      </ConfirmDialog>
    )
    
    // Verify no HTML nesting warnings were logged
    const errorCalls = consoleSpy.mock.calls
    const htmlNestingErrors = errorCalls.filter(call => {
      const message = call[0]?.toString() || ''
      return message.includes('cannot be a descendant of <p>') ||
             message.includes('cannot contain a nested')
    })
    
    expect(htmlNestingErrors).toHaveLength(0)
    
    consoleSpy.mockRestore()
  })
  
  it('should render string description without errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ConfirmDialog
        title="Test Dialog"
        description="Simple text description"
        confirmLabel="Confirm"
      >
        <ConfirmDialog.Trigger>Open Dialog</ConfirmDialog.Trigger>
      </ConfirmDialog>
    )
    
    // Verify no console errors
    expect(consoleSpy).not.toHaveBeenCalled()
    
    consoleSpy.mockRestore()
  })
  
  it('should render complex React components without accessibility warnings', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const ComplexDescription = () => (
      <div>
        <h3>Main Title</h3>
        <div>
          <h4>Subtitle</h4>
          <p>Paragraph content</p>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
        </div>
      </div>
    )
    
    render(
      <ConfirmDialog
        title="Test Dialog"
        description={<ComplexDescription />}
        confirmLabel="Confirm"
      >
        <ConfirmDialog.Trigger>Open Dialog</ConfirmDialog.Trigger>
      </ConfirmDialog>
    )
    
    const user = userEvent.setup()
    await user.click(screen.getByText('Open Dialog'))
    
    // Check that the dialog content is rendered properly
    expect(screen.getByText('Main Title')).toBeInTheDocument()
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
    expect(screen.getByText('Paragraph content')).toBeInTheDocument()
    
    // Verify no accessibility warnings were logged
    const errorCalls = consoleSpy.mock.calls
    const accessibilityWarnings = errorCalls.filter(call => {
      const message = call[0]?.toString() || ''
      return message.includes('AlertDialogContent requires a description')
    })
    
    expect(accessibilityWarnings).toHaveLength(0)
    
    consoleSpy.mockRestore()
  })
  
  it('should have proper accessibility structure when dialog is open', async () => {
    render(
      <ConfirmDialog
        title="Accessibility Test"
        description="This is a test description"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      >
        <ConfirmDialog.Trigger>Open Dialog</ConfirmDialog.Trigger>
      </ConfirmDialog>
    )
    
    const user = userEvent.setup()
    await user.click(screen.getByText('Open Dialog'))
    
    // Verify dialog structure
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    
    // Verify title
    expect(screen.getByText('Accessibility Test')).toBeInTheDocument()
    
    // Verify description
    expect(screen.getByText('This is a test description')).toBeInTheDocument()
    
    // Verify buttons
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
  
  it('should not produce AlertDialogContent accessibility warning (POS-183)', () => {
    // This test specifically addresses the bug reported in POS-183
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Simulate the News component structure that was causing the issue
    const NewsLikeDescription = () => (
      <div className="space-y-4">
        <h3>O que há de novo</h3>
        <div className="space-y-2">
          <h4>News Title</h4>
          <p>News content with multiple paragraphs and elements.</p>
        </div>
      </div>
    )
    
    render(
      <ConfirmDialog
        title="News"
        description={<NewsLikeDescription />}
        confirmLabel="Não mostrar isso novamente"
        open={true}
      />
    )
    
    // Verify the specific warning from POS-183 is not present
    const errorCalls = consoleSpy.mock.calls
    const alertDialogWarnings = errorCalls.filter(call => {
      const message = call[0]?.toString() || ''
      return message.includes('AlertDialogContent requires a description for the component to be accessible')
    })
    
    expect(alertDialogWarnings).toHaveLength(0)
    
    consoleSpy.mockRestore()
  })
})