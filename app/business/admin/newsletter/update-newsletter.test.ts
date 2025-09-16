/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { updateNewsletter } from './newsletter.server'
import { db } from '~/lib/supabase/db.server'

// Mock the database
vi.mock('~/lib/supabase/db.server', () => ({
  db: {
    selectFrom: vi.fn(() => ({
      select: vi.fn(() => ({
        where: vi.fn(() => ({
          executeTakeFirst: vi.fn(),
        })),
      })),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returningAll: vi.fn(() => ({
            executeTakeFirst: vi.fn(),
          })),
        })),
      })),
    })),
  },
}))

describe('updateNewsletter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update a newsletter', async () => {
    const mockUpdatedNewsletter = {
      id: 'newsletter-123',
      subject: 'Updated Newsletter',
      template_name: 'event-announcement',
      content_mdx: '# Updated Content',
      status: 'draft',
      updated_at: new Date().toISOString(),
    }

    // Mock the selectFrom for status check
    const selectExecuteTakeFirst = vi.fn().mockResolvedValue({ status: 'draft' })
    const selectWhere = vi.fn(() => ({ executeTakeFirst: selectExecuteTakeFirst }))
    const select = vi.fn(() => ({ where: selectWhere }))
    const selectFrom = vi.fn(() => ({ select }))
    vi.mocked(db.selectFrom).mockImplementation(selectFrom as any)

    // Mock the updateTable
    const updateExecuteTakeFirst = vi.fn().mockResolvedValue(mockUpdatedNewsletter)
    const returningAll = vi.fn(() => ({ executeTakeFirst: updateExecuteTakeFirst }))
    const updateWhere = vi.fn(() => ({ returningAll }))
    const set = vi.fn(() => ({ where: updateWhere }))
    const updateTable = vi.fn(() => ({ set }))
    vi.mocked(db.updateTable).mockImplementation(updateTable as any)

    const result = await updateNewsletter('newsletter-123', {
      subject: 'Updated Newsletter',
      template_name: 'event-announcement',
      content_mdx: '# Updated Content',
    })

    expect(selectFrom).toHaveBeenCalledWith('newsletters')
    expect(select).toHaveBeenCalledWith('status')
    expect(selectWhere).toHaveBeenCalledWith('id', '=', 'newsletter-123')
    expect(updateTable).toHaveBeenCalledWith('newsletters')
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Updated Newsletter',
      template_name: 'event-announcement',
      content_mdx: '# Updated Content',
      updated_at: expect.any(String),
    }))
    expect(updateWhere).toHaveBeenCalledWith('id', '=', 'newsletter-123')
    expect(result).toEqual(mockUpdatedNewsletter)
  })

  it('should update scheduled_at when provided', async () => {
    const mockUpdatedNewsletter = {
      id: 'newsletter-123',
      subject: 'Scheduled Newsletter',
      template_name: 'general-news',
      content_mdx: '# Content',
      status: 'scheduled',
      scheduled_at: '2025-12-25T10:00:00',
      updated_at: new Date().toISOString(),
    }

    // Mock the selectFrom for status check
    const selectExecuteTakeFirst = vi.fn().mockResolvedValue({ status: 'draft' })
    const selectWhere = vi.fn(() => ({ executeTakeFirst: selectExecuteTakeFirst }))
    const select = vi.fn(() => ({ where: selectWhere }))
    const selectFrom = vi.fn(() => ({ select }))
    vi.mocked(db.selectFrom).mockImplementation(selectFrom as any)

    // Mock the updateTable
    const updateExecuteTakeFirst = vi.fn().mockResolvedValue(mockUpdatedNewsletter)
    const returningAll = vi.fn(() => ({ executeTakeFirst: updateExecuteTakeFirst }))
    const updateWhere = vi.fn(() => ({ returningAll }))
    const set = vi.fn(() => ({ where: updateWhere }))
    const updateTable = vi.fn(() => ({ set }))
    vi.mocked(db.updateTable).mockImplementation(updateTable as any)

    const result = await updateNewsletter('newsletter-123', {
      subject: 'Scheduled Newsletter',
      status: 'scheduled',
      scheduled_at: '2025-12-25T10:00:00',
    })

    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Scheduled Newsletter',
      status: 'scheduled',
      scheduled_at: '2025-12-25T10:00:00',
    }))
    expect(result).toEqual(mockUpdatedNewsletter)
  })

  it('should throw error if newsletter not found', async () => {
    // Mock the selectFrom to return undefined (not found)
    const selectExecuteTakeFirst = vi.fn().mockResolvedValue(undefined)
    const selectWhere = vi.fn(() => ({ executeTakeFirst: selectExecuteTakeFirst }))
    const select = vi.fn(() => ({ where: selectWhere }))
    const selectFrom = vi.fn(() => ({ select }))
    vi.mocked(db.selectFrom).mockImplementation(selectFrom as any)

    await expect(
      updateNewsletter('invalid-id', {
        subject: 'Updated Newsletter',
      })
    ).rejects.toThrow('Newsletter not found')
  })

  it('should throw error if newsletter is sent or failed', async () => {
    // Mock the selectFrom to return a non-draft newsletter
    const selectExecuteTakeFirst = vi.fn().mockResolvedValue({ status: 'sent' })
    const selectWhere = vi.fn(() => ({ executeTakeFirst: selectExecuteTakeFirst }))
    const select = vi.fn(() => ({ where: selectWhere }))
    const selectFrom = vi.fn(() => ({ select }))
    vi.mocked(db.selectFrom).mockImplementation(selectFrom as any)

    await expect(
      updateNewsletter('newsletter-123', {
        subject: 'Updated Newsletter',
      })
    ).rejects.toThrow('Newsletters that are being sent, have been sent, or failed cannot be updated')
  })

  it('should only update provided fields', async () => {
    const mockUpdatedNewsletter = {
      id: 'newsletter-123',
      subject: 'Only Subject Updated',
      template_name: 'general-news',
      content_mdx: '# Original Content',
      status: 'draft',
      updated_at: new Date().toISOString(),
    }

    // Mock the selectFrom for status check
    const selectExecuteTakeFirst = vi.fn().mockResolvedValue({ status: 'draft' })
    const selectWhere = vi.fn(() => ({ executeTakeFirst: selectExecuteTakeFirst }))
    const select = vi.fn(() => ({ where: selectWhere }))
    const selectFrom = vi.fn(() => ({ select }))
    vi.mocked(db.selectFrom).mockImplementation(selectFrom as any)

    // Mock the updateTable
    const updateExecuteTakeFirst = vi.fn().mockResolvedValue(mockUpdatedNewsletter)
    const returningAll = vi.fn(() => ({ executeTakeFirst: updateExecuteTakeFirst }))
    const updateWhere = vi.fn(() => ({ returningAll }))
    const set = vi.fn(() => ({ where: updateWhere }))
    const updateTable = vi.fn(() => ({ set }))
    vi.mocked(db.updateTable).mockImplementation(updateTable as any)

    const result = await updateNewsletter('newsletter-123', {
      subject: 'Only Subject Updated',
    })

    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Only Subject Updated',
      updated_at: expect.any(String),
    }))
    // Should not include other fields
    expect(set).not.toHaveBeenCalledWith(expect.objectContaining({
      template_name: expect.anything(),
      content_mdx: expect.anything(),
    }))
    expect(result).toEqual(mockUpdatedNewsletter)
  })
})