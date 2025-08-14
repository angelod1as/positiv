import { describe, expect, it } from "vitest"
import { generateAnalyticsCSV, type NewsletterAnalytics } from "./newsletter-analytics.server"

describe("Newsletter Analytics", () => {
  describe("generateAnalyticsCSV", () => {
    it("should generate CSV with all analytics data", () => {
      const analytics: NewsletterAnalytics = {
        newsletterId: "test-id",
        totalRecipients: 150,
        successfulSends: 145,
        failedSends: 5,
        deliveryRate: 96.67,
        unsubscribes: 3,
        sendDuration: 5.5,
        averageSendTime: 2.2
      }

      const csv = generateAnalyticsCSV(analytics, "Test Newsletter")
      
      const lines = csv.split("\n")
      expect(lines).toHaveLength(2) // Header + data row
      
      // Check headers
      expect(lines[0]).toBe(
        "Newsletter Subject,Total Recipients,Successful Sends,Failed Sends,Delivery Rate (%),Unsubscribes,Send Duration (minutes),Average Send Time (seconds/email)"
      )
      
      // Check data
      expect(lines[1]).toBe(
        "Test Newsletter,150,145,5,96.67,3,5.5,2.2"
      )
    })

    it("should handle special characters in newsletter subject", () => {
      const analytics: NewsletterAnalytics = {
        newsletterId: "test-id",
        totalRecipients: 10,
        successfulSends: 10,
        failedSends: 0,
        deliveryRate: 100,
        unsubscribes: 0,
        sendDuration: 1,
        averageSendTime: 6
      }

      const csv = generateAnalyticsCSV(analytics, 'Newsletter with "quotes" and, commas')
      
      const lines = csv.split("\n")
      expect(lines[1]).toBe(
        '"Newsletter with ""quotes"" and, commas",10,10,0,100,0,1,6'
      )
    })

    it("should handle zero values correctly", () => {
      const analytics: NewsletterAnalytics = {
        newsletterId: "test-id",
        totalRecipients: 0,
        successfulSends: 0,
        failedSends: 0,
        deliveryRate: 0,
        unsubscribes: 0,
        sendDuration: 0,
        averageSendTime: 0
      }

      const csv = generateAnalyticsCSV(analytics, "Empty Newsletter")
      
      const lines = csv.split("\n")
      expect(lines[1]).toBe(
        "Empty Newsletter,0,0,0,0,0,0,0"
      )
    })

    it("should format decimal values properly", () => {
      const analytics: NewsletterAnalytics = {
        newsletterId: "test-id",
        totalRecipients: 333,
        successfulSends: 111,
        failedSends: 222,
        deliveryRate: 33.33,
        unsubscribes: 5,
        sendDuration: 12.7,
        averageSendTime: 2.3
      }

      const csv = generateAnalyticsCSV(analytics, "Decimal Test")
      
      const lines = csv.split("\n")
      expect(lines[1]).toBe(
        "Decimal Test,333,111,222,33.33,5,12.7,2.3"
      )
    })
  })
})