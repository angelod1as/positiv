import { expect } from '@playwright/test'

const MAILHOG_API_BASE = 'http://0.0.0.0:8025/api'

interface MailhogMessage {
  ID: string
  From: {
    Mailbox: string
    Domain: string
  }
  To: Array<{
    Mailbox: string
    Domain: string
  }>
  Content: {
    Headers: {
      Subject: string[]
      [key: string]: string[]
    }
    Body: string
  }
  Created: string
}

interface MailhogResponse {
  total: number
  count: number
  start: number
  items: MailhogMessage[]
}

export async function clearAllEmails(): Promise<void> {
  try {
    const response = await fetch(`${MAILHOG_API_BASE}/v1/messages`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to clear emails: ${response.statusText}`)
    }
  } catch (error) {
    console.warn('Failed to clear Mailhog emails:', error)
  }
}

export async function getAllEmails(): Promise<MailhogMessage[]> {
  const response = await fetch(`${MAILHOG_API_BASE}/v2/messages`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch emails: ${response.statusText}`)
  }
  
  const data: MailhogResponse = await response.json()
  return data.items || []
}

export async function waitForEmail(options: {
  to?: string
  subject?: string
  timeout?: number
  containing?: string
}): Promise<MailhogMessage> {
  const { to, subject, timeout = 30000, containing } = options
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const emails = await getAllEmails()
    
    const matchingEmail = emails.find(email => {
      // Check recipient
      if (to) {
        const hasRecipient = email.To.some(recipient => 
          `${recipient.Mailbox}@${recipient.Domain}`.toLowerCase() === to.toLowerCase()
        )
        if (!hasRecipient) return false
      }
      
      // Check subject
      if (subject) {
        const emailSubject = email.Content.Headers.Subject?.[0] || ''
        if (!emailSubject.includes(subject)) return false
      }
      
      // Check body content
      if (containing) {
        if (!email.Content.Body.includes(containing)) return false
      }
      
      return true
    })
    
    if (matchingEmail) {
      return matchingEmail
    }
    
    // Wait a bit before trying again
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error(`Email not found within ${timeout}ms. Criteria: ${JSON.stringify({ to, subject, containing })}`)
}

export async function getLatestEmail(): Promise<MailhogMessage | null> {
  const emails = await getAllEmails()
  return emails.length > 0 ? emails[0] : null
}

export async function getEmailsByRecipient(recipient: string): Promise<MailhogMessage[]> {
  const emails = await getAllEmails()
  
  return emails.filter(email => 
    email.To.some(to => 
      `${to.Mailbox}@${to.Domain}`.toLowerCase() === recipient.toLowerCase()
    )
  )
}

export async function verifyEmailContent(email: MailhogMessage, expectations: {
  subject?: string
  bodyContains?: string[]
  from?: string
}): Promise<void> {
  if (expectations.subject) {
    const emailSubject = email.Content.Headers.Subject?.[0] || ''
    expect(emailSubject).toContain(expectations.subject)
  }
  
  if (expectations.bodyContains) {
    for (const text of expectations.bodyContains) {
      expect(email.Content.Body).toContain(text)
    }
  }
  
  if (expectations.from) {
    const fromAddress = `${email.From.Mailbox}@${email.From.Domain}`
    expect(fromAddress.toLowerCase()).toBe(expectations.from.toLowerCase())
  }
}

export async function getEmailCount(): Promise<number> {
  const emails = await getAllEmails()
  return emails.length
}

export async function deleteEmail(emailId: string): Promise<void> {
  const response = await fetch(`${MAILHOG_API_BASE}/v1/messages/${emailId}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    throw new Error(`Failed to delete email: ${response.statusText}`)
  }
}

export function extractEmailBody(email: MailhogMessage): string {
  // Mailhog stores the body as base64 encoded or plain text
  const body = email.Content.Body
  
  // Try to decode if it looks like base64
  if (body && /^[A-Za-z0-9+/=]+$/.test(body.trim())) {
    try {
      return Buffer.from(body, 'base64').toString('utf-8')
    } catch {
      // Not base64, return as is
      return body
    }
  }
  
  return body
}

export async function verifyApplicationEmail(recipientEmail: string): Promise<void> {
  const email = await waitForEmail({
    to: recipientEmail,
    subject: 'Você se inscreveu no evento',
    timeout: 10000
  })

  await verifyEmailContent(email, {
    subject: 'Você se inscreveu no evento',
    bodyContains: [
      'Sua inscrição foi recebida',
      'você se inscreveu com sucesso'
    ]
  })
}

export async function verifyReminderEmail(recipientEmail: string, eventTitle: string): Promise<void> {
  const email = await waitForEmail({
    to: recipientEmail,
    subject: `Inscrições abertas para o evento`,
    containing: eventTitle,
    timeout: 10000
  })
  
  await verifyEmailContent(email, {
    subject: 'Inscrições abertas',
    bodyContains: [
      'Inscrições abertas!',
      eventTitle
    ]
  })
}