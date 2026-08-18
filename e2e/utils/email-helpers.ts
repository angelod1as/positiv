import { expect } from '@playwright/test'

const MAILPIT_API_BASE = 'http://127.0.0.1:54324/api'

interface MailpitAddress {
  Name: string
  Address: string
}

interface MailpitSummary {
  ID: string
  From: MailpitAddress
  To: MailpitAddress[]
  Subject: string
  Snippet: string
  Created: string
}

interface MailpitMessage extends MailpitSummary {
  Text: string
  HTML: string
}

interface MailpitResponse {
  total: number
  count: number
  start: number
  messages: MailpitSummary[]
}

export async function clearAllEmails(): Promise<void> {
  const response = await fetch(`${MAILPIT_API_BASE}/v1/messages`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error(`Failed to clear emails: ${response.statusText}`)
  }
}

export async function getAllEmails(): Promise<MailpitSummary[]> {
  const response = await fetch(`${MAILPIT_API_BASE}/v1/messages`)

  if (!response.ok) {
    throw new Error(`Failed to fetch emails: ${response.statusText}`)
  }

  const data: MailpitResponse = await response.json()
  return data.messages || []
}

export async function getEmail(id: string): Promise<MailpitMessage> {
  const response = await fetch(`${MAILPIT_API_BASE}/v1/message/${id}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch email ${id}: ${response.statusText}`)
  }

  return response.json()
}

export async function waitForEmail(options: {
  to?: string
  subject?: string
  timeout?: number
  containing?: string
}): Promise<MailpitMessage> {
  const { to, subject, timeout = 30000, containing } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const emails = await getAllEmails()

    const candidates = emails.filter(email => {
      // Check recipient
      if (to) {
        const hasRecipient = email.To.some(recipient =>
          recipient.Address.toLowerCase() === to.toLowerCase()
        )
        if (!hasRecipient) return false
      }

      // Check subject
      if (subject) {
        if (!email.Subject.includes(subject)) return false
      }

      return true
    })

    // The list endpoint only carries a snippet, so the body check needs the
    // full message.
    for (const candidate of candidates) {
      const email = await getEmail(candidate.ID)

      if (containing && !extractEmailBody(email).includes(containing)) {
        continue
      }

      return email
    }

    // Wait a bit before trying again
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error(`Email not found within ${timeout}ms. Criteria: ${JSON.stringify({ to, subject, containing })}`)
}

export async function getLatestEmail(): Promise<MailpitSummary | null> {
  const emails = await getAllEmails()
  return emails.length > 0 ? emails[0] : null
}

export async function getEmailsByRecipient(recipient: string): Promise<MailpitSummary[]> {
  const emails = await getAllEmails()

  return emails.filter(email =>
    email.To.some(to =>
      to.Address.toLowerCase() === recipient.toLowerCase()
    )
  )
}

export async function verifyEmailContent(email: MailpitMessage, expectations: {
  subject?: string
  bodyContains?: string[]
  from?: string
}): Promise<void> {
  if (expectations.subject) {
    expect(email.Subject).toContain(expectations.subject)
  }

  if (expectations.bodyContains) {
    const body = extractEmailBody(email)
    for (const text of expectations.bodyContains) {
      expect(body).toContain(text)
    }
  }

  if (expectations.from) {
    expect(email.From.Address.toLowerCase()).toBe(expectations.from.toLowerCase())
  }
}

export async function getEmailCount(): Promise<number> {
  const emails = await getAllEmails()
  return emails.length
}

export async function deleteEmail(emailId: string): Promise<void> {
  const response = await fetch(`${MAILPIT_API_BASE}/v1/messages`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IDs: [emailId] })
  })

  if (!response.ok) {
    throw new Error(`Failed to delete email: ${response.statusText}`)
  }
}

export function extractEmailBody(email: MailpitMessage): string {
  // Mailpit decodes both parts for us; the plain text one is the easier match.
  return email.Text || email.HTML
}

export async function verifyApplicationEmail(recipientEmail: string): Promise<void> {
  const email = await waitForEmail({
    to: recipientEmail,
    subject: 'Recebemos sua candidatura ao evento',
    timeout: 10000
  })

  await verifyEmailContent(email, {
    subject: 'Recebemos sua candidatura ao evento',
    bodyContains: [
      'Sua candidatura foi recebida',
      'sua candidatura foi enviada com sucesso'
    ]
  })
}

export async function verifyReminderEmail(recipientEmail: string, eventTitle: string): Promise<void> {
  const email = await waitForEmail({
    to: recipientEmail,
    subject: `Candidaturas abertas para o evento`,
    containing: eventTitle,
    timeout: 10000
  })

  await verifyEmailContent(email, {
    subject: 'Candidaturas abertas',
    bodyContains: [
      'Candidaturas abertas!',
      eventTitle
    ]
  })
}
