import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ConfirmDialog from './confirm-dialog'

describe('ConfirmDialog', () => {
  it('should render without errors when description is a React component', () => {
    const TestDescription = () => (
      <div data-testid="custom-description">
        <h4>Custom Title</h4>
        <p>Custom content with multiple elements</p>
      </div>
    )
    
    // This test verifies that removing asChild doesn't break the component
    // The actual rendering verification happens in the NewsDialog test
    expect(() => {
      render(
        <ConfirmDialog
          title="Test Dialog"
          description={<TestDescription />}
          confirmLabel="Confirm"
          open={true}
        />
      )
    }).not.toThrow()
  })
  
  it('should render without errors when description is a string', () => {
    expect(() => {
      render(
        <ConfirmDialog
          title="Test Dialog"
          description="Simple text description"
          confirmLabel="Confirm"
          open={true}
        />
      )
    }).not.toThrow()
  })
})