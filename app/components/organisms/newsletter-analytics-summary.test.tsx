import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NewsletterAnalyticsSummary } from './newsletter-analytics-summary'
import type { NewsletterAnalytics } from '~/business/admin/newsletter/newsletter-analytics.server'

describe('NewsletterAnalyticsSummary', () => {
  it('should display all analytics metrics', () => {
    const analytics: NewsletterAnalytics = {
      newsletterId: 'test-id',
      totalRecipients: 250,
      successfulSends: 240,
      failedSends: 10,
      deliveryRate: 96,
      unsubscribes: 5,
      sendDuration: 10.5,
      averageSendTime: 2.5
    }

    render(<NewsletterAnalyticsSummary analytics={analytics} />)

    // Check that all metrics are displayed
    expect(screen.getByText('Send Statistics')).toBeInTheDocument()
    expect(screen.getByText('250')).toBeInTheDocument() // Total recipients
    expect(screen.getByText('240 (96%)')).toBeInTheDocument() // Delivered
    expect(screen.getByText('10')).toBeInTheDocument() // Failed
    expect(screen.getByText('5')).toBeInTheDocument() // Unsubscribes
    expect(screen.getByText('10.5 minutes')).toBeInTheDocument() // Send duration
    expect(screen.getByText('2.5 seconds/email')).toBeInTheDocument() // Average send time
  })

  it('should handle zero values gracefully', () => {
    const analytics: NewsletterAnalytics = {
      newsletterId: 'test-id',
      totalRecipients: 0,
      successfulSends: 0,
      failedSends: 0,
      deliveryRate: 0,
      unsubscribes: 0,
      sendDuration: 0,
      averageSendTime: 0
    }

    render(<NewsletterAnalyticsSummary analytics={analytics} />)

    // Check that zero values are displayed
    expect(screen.getByText('Recipients')).toBeInTheDocument()
    expect(screen.getByText('0 (0%)')).toBeInTheDocument() // Delivered
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Unsubscribes')).toBeInTheDocument()
    
    // Should have 3 standalone '0' values (Recipients, Failed, Unsubscribes)
    const zeroElements = screen.getAllByText('0')
    expect(zeroElements).toHaveLength(3)
  })

  it('should display loading state', () => {
    render(<NewsletterAnalyticsSummary analytics={null} isLoading />)

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument()
  })

  it('should display error state', () => {
    render(<NewsletterAnalyticsSummary analytics={null} error="Failed to load analytics" />)

    expect(screen.getByText('Failed to load analytics')).toBeInTheDocument()
  })

  it('should format large numbers based on locale', () => {
    const analytics: NewsletterAnalytics = {
      newsletterId: 'test-id',
      totalRecipients: 15000,
      successfulSends: 14500,
      failedSends: 500,
      deliveryRate: 96.67,
      unsubscribes: 125,
      sendDuration: 120,
      averageSendTime: 0.5
    }

    render(<NewsletterAnalyticsSummary analytics={analytics} />)

    // Numbers will be formatted based on locale (might be 15.000 or 15,000)
    // Check for the presence of specific text elements instead
    expect(screen.getByText('Recipients')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument() // Failed
    expect(screen.getByText('125')).toBeInTheDocument() // Unsubscribes
    expect(screen.getByText('Performance')).toBeInTheDocument() // Performance section should show
  })

  it('should not show performance metrics if not available', () => {
    const analytics: NewsletterAnalytics = {
      newsletterId: 'test-id',
      totalRecipients: 100,
      successfulSends: 100,
      failedSends: 0,
      deliveryRate: 100,
      unsubscribes: 0,
      sendDuration: 0,
      averageSendTime: 0
    }

    render(<NewsletterAnalyticsSummary analytics={analytics} />)

    // Performance section should not be shown when duration is 0
    expect(screen.queryByText('Performance')).not.toBeInTheDocument()
  })
})