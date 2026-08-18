import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllEmails,
  deleteEmail,
  extractEmailBody,
  getAllEmails,
  getEmailsByRecipient,
  getLatestEmail,
  verifyEmailContent,
  waitForEmail
} from './email-helpers'

const API_BASE = 'http://127.0.0.1:54324/api'

const summary = (overrides: Record<string, unknown> = {}) => ({
  ID: 'abc123',
  From: { Name: 'Positiv', Address: 'no-reply@positiv.com.br' },
  To: [{ Name: 'Fulano', Address: 'user@example.com' }],
  Subject: 'Recebemos sua candidatura ao evento Teste',
  Snippet: 'Sua candidatura foi recebida',
  Created: '2026-08-16T23:14:15.035-03:00',
  ...overrides
})

const message = (overrides: Record<string, unknown> = {}) => ({
  ...summary(),
  Text: 'Sua candidatura foi recebida',
  HTML: '<p>Sua candidatura foi recebida</p>',
  ...overrides
})

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as Response

const errorResponse = (status: number, statusText: string) =>
  ({ ok: false, status, statusText, json: async () => ({}) }) as Response

const listOf = (...messages: unknown[]) => ({
  total: messages.length,
  unread: 0,
  count: messages.length,
  messages_count: messages.length,
  start: 0,
  tags: [],
  messages
})

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('clearAllEmails', () => {
  it('deletes every message through the Mailpit v1 endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse('ok'))

    await clearAllEmails()

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/v1/messages`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('fails loudly when the catcher is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:54324'))

    await expect(clearAllEmails()).rejects.toThrow('ECONNREFUSED')
  })

  it('fails loudly on a bad response', async () => {
    fetchMock.mockResolvedValue(errorResponse(404, 'Not Found'))

    await expect(clearAllEmails()).rejects.toThrow('Not Found')
  })
})

describe('getAllEmails', () => {
  it('reads the v1 list endpoint and returns its messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse(listOf(summary())))

    const emails = await getAllEmails()

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/v1/messages`)
    expect(emails).toHaveLength(1)
    expect(emails[0].Subject).toBe('Recebemos sua candidatura ao evento Teste')
  })

  it('fails loudly on a bad response', async () => {
    fetchMock.mockResolvedValue(errorResponse(404, 'Not Found'))

    await expect(getAllEmails()).rejects.toThrow('Not Found')
  })
})

describe('getLatestEmail', () => {
  it('returns null when the mailbox is empty', async () => {
    fetchMock.mockResolvedValue(jsonResponse(listOf()))

    expect(await getLatestEmail()).toBeNull()
  })
})

describe('getEmailsByRecipient', () => {
  it('matches on the recipient address, ignoring case', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        listOf(
          summary(),
          summary({ ID: 'other', To: [{ Name: '', Address: 'someone@else.com' }] })
        )
      )
    )

    const emails = await getEmailsByRecipient('USER@example.com')

    expect(emails).toHaveLength(1)
    expect(emails[0].ID).toBe('abc123')
  })
})

describe('waitForEmail', () => {
  it('matches recipient and subject, then returns the full message', async () => {
    fetchMock.mockImplementation((url: string) =>
      url === `${API_BASE}/v1/messages`
        ? Promise.resolve(jsonResponse(listOf(summary())))
        : Promise.resolve(jsonResponse(message()))
    )

    const email = await waitForEmail({
      to: 'user@example.com',
      subject: 'Recebemos sua candidatura',
      timeout: 1000
    })

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/v1/message/abc123`)
    expect(email.Text).toBe('Sua candidatura foi recebida')
  })

  it('matches on body content fetched from the single message endpoint', async () => {
    fetchMock.mockImplementation((url: string) =>
      url === `${API_BASE}/v1/messages`
        ? Promise.resolve(jsonResponse(listOf(summary())))
        : Promise.resolve(jsonResponse(message({ Text: 'Candidaturas abertas! Festa de Verão' })))
    )

    const email = await waitForEmail({ containing: 'Festa de Verão', timeout: 1000 })

    expect(email.ID).toBe('abc123')
  })

  it('throws when nothing matches before the timeout', async () => {
    fetchMock.mockResolvedValue(jsonResponse(listOf()))

    await expect(waitForEmail({ to: 'nobody@example.com', timeout: 10 })).rejects.toThrow(
      /Email not found/
    )
  })
})

describe('verifyEmailContent', () => {
  it('reads the top-level subject and the sender address', async () => {
    await expect(
      verifyEmailContent(message(), {
        subject: 'Recebemos sua candidatura',
        from: 'no-reply@positiv.com.br',
        bodyContains: ['Sua candidatura foi recebida']
      })
    ).resolves.toBeUndefined()
  })

  it('fails when the body does not contain the expected text', async () => {
    await expect(
      verifyEmailContent(message(), { bodyContains: ['nunca enviado'] })
    ).rejects.toThrow()
  })
})

describe('extractEmailBody', () => {
  it('prefers the plain text part', () => {
    expect(extractEmailBody(message())).toBe('Sua candidatura foi recebida')
  })

  it('falls back to the HTML part', () => {
    expect(extractEmailBody(message({ Text: '' }))).toBe('<p>Sua candidatura foi recebida</p>')
  })
})

describe('deleteEmail', () => {
  it('deletes a single message by ID', async () => {
    fetchMock.mockResolvedValue(jsonResponse('ok'))

    await deleteEmail('abc123')

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/v1/messages`,
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ IDs: ['abc123'] })
      })
    )
  })
})
