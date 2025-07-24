import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFetcher } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProfileWithRoles } from '~types/entities.types'
import { NewsDialog } from './news-dialog'
import type { NewsItem } from './news'

vi.mock('react-router', () => ({
  useFetcher: vi.fn(),
}))

vi.mock('~/lib/helpers/constants', () => ({
  NEWS_VERSION: 123456789,
}))

const mockNewsItems: NewsItem[] = [
  {
    id: '1',
    title: 'Regular Feature Update',
    content: 'Now you can export reports in PDF format',
    isAdmin: false,
    createdAt: new Date(),
    isActive: true,
  },
  {
    id: '2',
    title: 'Admin-Only Update',
    content: 'New dashboard metrics are available for monitoring',
    isAdmin: true,
    createdAt: new Date(),
    isActive: true,
  },
]

vi.mock('./news', () => ({
  News: vi.fn(({ newsItems, isAdmin }: { newsItems: NewsItem[], isAdmin: boolean }) => {
    const filtered = newsItems.filter(item => !item.isAdmin || isAdmin)
    return (
      <div>
        {filtered.map(item => (
          <div key={item.id}>
            <h4>{item.title}</h4>
            <p>{item.content}</p>
          </div>
        ))}
      </div>
    )
  }),
}))

describe('NewsDialog', () => {
  const mockSubmit = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useFetcher).mockReturnValue({
      submit: mockSubmit,
    } as unknown as ReturnType<typeof useFetcher>)
    
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/test' },
      writable: true,
    })
  })
  
  describe('Dialog visibility based on NEWS_VERSION', () => {
    it('should show bell icon in header when there is news', () => {
      render(<NewsDialog isThereAnyNews={true} isHeader={true} currentProfile={null} newsItems={mockNewsItems} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button.querySelector('svg')).toBeInTheDocument()
    })
    
    it('should not show bell icon in header when there is no news', () => {
      render(<NewsDialog isThereAnyNews={false} isHeader={true} currentProfile={null} newsItems={mockNewsItems} />)
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
    
    it('should show footer link regardless of news status', () => {
      render(<NewsDialog isThereAnyNews={false} isHeader={false} currentProfile={null} newsItems={mockNewsItems} />)
      
      expect(screen.getByText('Veja as novidades do site')).toBeInTheDocument()
    })
  })
  
  describe('Role-based content filtering', () => {
    it('should pass isAdmin=false for regular users', async () => {
      const regularProfile: ProfileWithRoles = {
        id: '1',
        email: 'user@test.com',
        full_name: 'Regular User',
        is_admin: false,
        basic_data_filled: true,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
        allow_marketing_email: null,
        created_at: '2024-01-01',
      }
      
      render(<NewsDialog isThereAnyNews={true} isHeader={false} currentProfile={regularProfile} newsItems={mockNewsItems} />)
      
      const user = userEvent.setup()
      await user.click(screen.getByText('Veja as novidades do site'))
      
      expect(screen.getByText('Regular Feature Update')).toBeInTheDocument()
      expect(screen.queryByText('Admin-Only Update')).not.toBeInTheDocument()
    })
    
    it('should pass isAdmin=true for admin users', async () => {
      const adminProfile: ProfileWithRoles = {
        id: '1',
        email: 'admin@test.com',
        full_name: 'Admin User',
        is_admin: true,
        basic_data_filled: true,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
        allow_marketing_email: null,
        created_at: '2024-01-01',
      }
      
      render(<NewsDialog isThereAnyNews={true} isHeader={false} currentProfile={adminProfile} newsItems={mockNewsItems} />)
      
      const user = userEvent.setup()
      await user.click(screen.getByText('Veja as novidades do site'))
      
      expect(screen.getByText('Regular Feature Update')).toBeInTheDocument()
      expect(screen.getByText('Admin-Only Update')).toBeInTheDocument()
    })
  })
  
  describe('User interaction', () => {
    it('should submit form when clicking "don\'t show again"', async () => {
      render(<NewsDialog isThereAnyNews={true} isHeader={false} currentProfile={null} newsItems={mockNewsItems} />)
      
      const user = userEvent.setup()
      await user.click(screen.getByText('Veja as novidades do site'))
      
      const confirmButton = screen.getByText('Não mostrar isso novamente')
      await user.click(confirmButton)
      
      expect(mockSubmit).toHaveBeenCalledWith(
        {
          newsVersion: '123456789',
          intent: 'news-update',
          thisUrl: 'http://localhost:3000/test',
        },
        { method: 'POST' }
      )
    })
  })
})