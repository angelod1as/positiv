import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { News } from './news'
import { hasVisibleNews } from './news-utils'

interface NewsItem {
  id: string
  title: string
  content: string
  isAdmin: boolean
  createdAt: Date
  isActive: boolean
}

describe('News', () => {
  describe('News Item Data Structure and Filtering', () => {
    it('should filter out news items older than 2 weeks', () => {
      const threeWeeksAgo = new Date()
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)
      
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      const today = new Date()
      
      const newsItems: NewsItem[] = [
        {
          id: '1',
          title: 'Old news',
          content: 'This is old news',
          isAdmin: false,
          createdAt: threeWeeksAgo,
          isActive: true,
        },
        {
          id: '2',
          title: 'Recent news',
          content: 'This is recent news',
          isAdmin: false,
          createdAt: oneWeekAgo,
          isActive: true,
        },
        {
          id: '3',
          title: 'Today news',
          content: 'This is today news',
          isAdmin: false,
          createdAt: today,
          isActive: true,
        },
      ]
      
      render(<News newsItems={newsItems} isAdmin={false} />)
      
      expect(screen.queryByText('Old news')).not.toBeInTheDocument()
      expect(screen.getByText('Recent news')).toBeInTheDocument()
      expect(screen.getByText('Today news')).toBeInTheDocument()
    })
    
    it('should sort news items by date with newest first', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const today = new Date()
      
      const newsItems: NewsItem[] = [
        {
          id: '1',
          title: 'Yesterday news',
          content: 'This happened yesterday',
          isAdmin: false,
          createdAt: yesterday,
          isActive: true,
        },
        {
          id: '2',
          title: 'Today news',
          content: 'This happened today',
          isAdmin: false,
          createdAt: today,
          isActive: true,
        },
      ]
      
      render(<News newsItems={newsItems} isAdmin={false} />)
      
      const titles = screen.getAllByRole('heading', { level: 4 })
      expect(titles[0]).toHaveTextContent('Today news')
      expect(titles[1]).toHaveTextContent('Yesterday news')
    })
    
    it('should only show active news items', () => {
      const today = new Date()
      
      const newsItems: NewsItem[] = [
        {
          id: '1',
          title: 'Active news',
          content: 'This is active',
          isAdmin: false,
          createdAt: today,
          isActive: true,
        },
        {
          id: '2',
          title: 'Inactive news',
          content: 'This is inactive',
          isAdmin: false,
          createdAt: today,
          isActive: false,
        },
      ]
      
      render(<News newsItems={newsItems} isAdmin={false} />)
      
      expect(screen.getByText('Active news')).toBeInTheDocument()
      expect(screen.queryByText('Inactive news')).not.toBeInTheDocument()
    })
  })
  
  describe('Role-based Visibility', () => {
    it('should not show admin-only news items to regular users', () => {
      const today = new Date()
      
      const newsItems: NewsItem[] = [
        {
          id: '1',
          title: 'Regular news',
          content: 'Everyone can see this',
          isAdmin: false,
          createdAt: today,
          isActive: true,
        },
        {
          id: '2',
          title: 'Admin news',
          content: 'Only admins can see this',
          isAdmin: true,
          createdAt: today,
          isActive: true,
        },
      ]
      
      render(<News newsItems={newsItems} isAdmin={false} />)
      
      expect(screen.getByText('Regular news')).toBeInTheDocument()
      expect(screen.queryByText('Admin news')).not.toBeInTheDocument()
    })
    
    it('should show all news items to admin users', () => {
      const today = new Date()
      
      const newsItems: NewsItem[] = [
        {
          id: '1',
          title: 'Regular news',
          content: 'Everyone can see this',
          isAdmin: false,
          createdAt: today,
          isActive: true,
        },
        {
          id: '2',
          title: 'Admin news',
          content: 'Only admins can see this',
          isAdmin: true,
          createdAt: today,
          isActive: true,
        },
      ]
      
      render(<News newsItems={newsItems} isAdmin={true} />)
      
      expect(screen.getByText('Regular news')).toBeInTheDocument()
      expect(screen.getByText('Admin news')).toBeInTheDocument()
    })
  })
  
  describe('Display formatting', () => {
    it('should display relative timestamps for recent news', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const newsItems: NewsItem[] = [
        {
          id: '1',
          title: 'Yesterday news',
          content: 'This happened yesterday',
          isAdmin: false,
          createdAt: yesterday,
          isActive: true,
        },
      ]
      
      render(<News newsItems={newsItems} isAdmin={false} />)
      
      expect(screen.getByText(/há 1 dia/i)).toBeInTheDocument()
    })
  })
  
  describe('hasVisibleNews helper', () => {
    it('should return false for regular user when only admin news exist', () => {
      const adminOnlyNews: NewsItem[] = [
        {
          id: '1',
          title: 'Admin only',
          content: 'Admin content',
          isAdmin: true,
          createdAt: new Date(),
          isActive: true,
        },
      ]
      
      expect(hasVisibleNews(false, adminOnlyNews)).toBe(false)
    })
    
    it('should return true for admin user when only admin news exist', () => {
      const adminOnlyNews: NewsItem[] = [
        {
          id: '1',
          title: 'Admin only',
          content: 'Admin content',
          isAdmin: true,
          createdAt: new Date(),
          isActive: true,
        },
      ]
      
      expect(hasVisibleNews(true, adminOnlyNews)).toBe(true)
    })
    
    it('should return true for regular user when regular news exist', () => {
      const mixedNews: NewsItem[] = [
        {
          id: '1',
          title: 'Regular news',
          content: 'Regular content',
          isAdmin: false,
          createdAt: new Date(),
          isActive: true,
        },
        {
          id: '2',
          title: 'Admin news',
          content: 'Admin content',
          isAdmin: true,
          createdAt: new Date(),
          isActive: true,
        },
      ]
      
      expect(hasVisibleNews(false, mixedNews)).toBe(true)
    })
    
    it('should return false when all news are older than 2 weeks', () => {
      const oldNews: NewsItem[] = [
        {
          id: '1',
          title: 'Old news',
          content: 'Old content',
          isAdmin: false,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
          isActive: true,
        },
      ]
      
      expect(hasVisibleNews(false, oldNews)).toBe(false)
    })
  })
})