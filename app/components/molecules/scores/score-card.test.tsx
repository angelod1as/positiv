import { render, screen } from '@testing-library/react'
import { TrendingUp } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { ScoreCard } from './score-card'

describe('ScoreCard', () => {
  it('renders value and label', () => {
    render(<ScoreCard value={42} label="Total Users" />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Total Users')).toBeInTheDocument()
  })

  it('renders string values', () => {
    render(<ScoreCard value="R$ 1.200" label="Revenue" />)
    expect(screen.getByText('R$ 1.200')).toBeInTheDocument()
  })

  it('shows upward trend with green color', () => {
    render(<ScoreCard value={100} label="Sales" trend="up" trendValue="+12%" />)
    const trendElement = screen.getByText('+12%')
    expect(trendElement.closest('[data-slot="trend"]')).toHaveClass('text-green-600')
  })

  it('shows downward trend with red color', () => {
    render(<ScoreCard value={50} label="Churn" trend="down" trendValue="-5%" />)
    const trendElement = screen.getByText('-5%')
    expect(trendElement.closest('[data-slot="trend"]')).toHaveClass('text-red-600')
  })

  it('shows neutral trend with muted color', () => {
    render(<ScoreCard value={75} label="Retention" trend="neutral" trendValue="0%" />)
    const trendElement = screen.getByText('0%')
    expect(trendElement.closest('[data-slot="trend"]')).toHaveClass('text-muted-foreground')
  })

  it('does not render trend when prop is absent', () => {
    const { container } = render(<ScoreCard value={10} label="Count" />)
    expect(container.querySelector('[data-slot="trend"]')).not.toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<ScoreCard value={20} label="Active" description="Last 30 days" />)
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('does not render description when absent', () => {
    const { container } = render(<ScoreCard value={20} label="Active" />)
    expect(container.querySelector('[data-slot="description"]')).not.toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    const { container } = render(<ScoreCard value={5} label="Items" icon={TrendingUp} />)
    expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
  })

  it('does not render icon when absent', () => {
    const { container } = render(<ScoreCard value={5} label="Items" />)
    expect(container.querySelector('[data-slot="icon"]')).not.toBeInTheDocument()
  })

  it('renders within a Card component', () => {
    const { container } = render(<ScoreCard value={1} label="Test" />)
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<ScoreCard value={1} label="Test" className="custom-class" />)
    expect(container.querySelector('[data-slot="card"]')).toHaveClass('custom-class')
  })
})
