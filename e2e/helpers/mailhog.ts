import { request } from '@playwright/test'

export class MailhogHelper {
  private readonly apiUrl = 'http://localhost:8025/api'

  async clearAllMessages() {
    const context = await request.newContext()
    try {
      await context.delete(`${this.apiUrl}/v1/messages`)
    } catch (error) {
      // Mailhog might not be running in CI or might return 204 No Content
      console.warn('Could not clear Mailhog messages:', error)
    } finally {
      await context.dispose()
    }
  }

  async getMessages() {
    const context = await request.newContext()
    try {
      const response = await context.get(`${this.apiUrl}/v2/messages`)
      if (response.ok()) {
        const data = await response.json()
        return data.items || []
      }
      return []
    } catch (error) {
      console.warn('Could not get Mailhog messages:', error)
      return []
    } finally {
      await context.dispose()
    }
  }

  async getMessagesByRecipient(email: string) {
    const messages = await this.getMessages()
    return messages.filter((msg: unknown) => {
      const message = msg as { Raw?: { To?: string[] } }
      return message.Raw?.To?.some((to: string) => to.includes(email)) || false
    })
  }

  async getLatestMessage() {
    const messages = await this.getMessages()
    return messages[0] || null
  }

  async getMessageContent(messageId: string) {
    const context = await request.newContext()
    try {
      const response = await context.get(`${this.apiUrl}/v1/messages/${messageId}`)
      if (response.ok()) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.warn('Could not get message content:', error)
      return null
    } finally {
      await context.dispose()
    }
  }

  async extractUnsubscribeLink(messageHtml: string): Promise<string | null> {
    const unsubscribeMatch = messageHtml.match(/href="([^"]*unsubscribe[^"]*)"/)
    return unsubscribeMatch ? unsubscribeMatch[1] : null
  }

  async waitForMessages(expectedCount: number, timeout = 30000): Promise<boolean> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      const messages = await this.getMessages()
      if (messages.length >= expectedCount) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return false
  }
}