interface NewsletterMock {
  id: string
  subject: string
  template_name: string
  content_mdx: string
  status: string
  created_at: string
  updated_at: string
  created_by: string
  sent_at: string | null
  scheduled_at: string | null
  send_started_at: string | null
  send_completed_at: string | null
  total_recipients: number | null
  successful_sends: number | null
  failed_sends: number | null
  exclude_rejected: boolean
  expected_recipient_count: number | null
  segment_filter: Record<string, unknown> | null
}

export function createMockNewsletter(overrides: Partial<NewsletterMock> = {}): NewsletterMock {
  return {
    id: 'newsletter-123',
    subject: 'Test Newsletter',
    template_name: 'general-news',
    content_mdx: '# Test Content',
    status: 'draft',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
    created_by: 'user-123',
    sent_at: null,
    scheduled_at: null,
    send_started_at: null,
    send_completed_at: null,
    total_recipients: null,
    successful_sends: null,
    failed_sends: null,
    exclude_rejected: true,
    expected_recipient_count: null,
    segment_filter: null,
    ...overrides
  }
}