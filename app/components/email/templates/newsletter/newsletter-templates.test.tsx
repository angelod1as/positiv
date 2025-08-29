import { render } from "@react-email/components"
import { describe, expect, it } from "vitest"
import { EventAnnouncement } from "./event-announcement"
import { GeneralNews } from "./general-news"

describe("Newsletter Templates", () => {
  describe("EventAnnouncement", () => {
    it("should render event announcement template with required props", async () => {
      const props = {
        subject: "Upcoming Event: Summer Party",
        content:
          "<h1>Summer Party</h1><p>Join us for an amazing summer event!</p>",
        unsubscribeUrl: "https://positiv.com/unsubscribe/abc123",
      }

      const html = await render(<EventAnnouncement {...props} />)

      expect(html).toContain("Summer Party")
      expect(html).toContain("Join us for an amazing summer event!")
    })

    it("should include unsubscribe link in footer", async () => {
      const props = {
        subject: "Event Update",
        content: "<p>Event details</p>",
        unsubscribeUrl: "https://positiv.com/unsubscribe/xyz789",
      }

      const html = await render(<EventAnnouncement {...props} />)

      expect(html).toContain(props.unsubscribeUrl)
      expect(html).toContain("descadastrar")
    })

    it("should have mobile responsive meta tag", async () => {
      const props = {
        subject: "Mobile Test",
        content: "<p>Content</p>",
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      }

      const html = await render(<EventAnnouncement {...props} />)

      expect(html).toContain("viewport")
      expect(html).toContain("width=device-width")
    })

    it("should render MDX-generated HTML content properly", async () => {
      const mdxContent = `
        <h2>Event Details</h2>
        <div class="event-card">
          <h3>Summer Festival</h3>
          <p>Date: February 15, 2025</p>
        </div>
        <a href="https://positiv.com/events" class="button">View Events</a>
      `

      const props = {
        subject: "Festival Announcement",
        content: mdxContent,
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      }

      const html = await render(<EventAnnouncement {...props} />)

      expect(html).toContain("Event Details")
      expect(html).toContain("Summer Festival")
      expect(html).toContain("February 15, 2025")
      expect(html).toContain("View Events")
    })
  })

  describe("GeneralNews", () => {
    it("should render general news template with required props", async () => {
      const props = {
        subject: "Community Update",
        content:
          "<h1>News</h1><p>Here are the latest updates from our community.</p>",
        unsubscribeUrl: "https://positiv.com/unsubscribe/def456",
      }

      const html = await render(<GeneralNews {...props} />)

      expect(html).toContain("News")
      expect(html).toContain("Here are the latest updates from our community.")
    })

    it("should include unsubscribe link in footer", async () => {
      const props = {
        subject: "Monthly Newsletter",
        content: "<p>Newsletter content</p>",
        unsubscribeUrl: "https://positiv.com/unsubscribe/ghi012",
      }

      const html = await render(<GeneralNews {...props} />)

      expect(html).toContain(props.unsubscribeUrl)
      expect(html).toContain("descadastrar")
    })

    it("should have mobile responsive meta tag", async () => {
      const props = {
        subject: "Mobile News",
        content: "<p>News content</p>",
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      }

      const html = await render(<GeneralNews {...props} />)

      expect(html).toContain("viewport")
      expect(html).toContain("width=device-width")
    })

    it("should render MDX-generated HTML content properly", async () => {
      const mdxContent = `
        <h2>Community Updates</h2>
        <blockquote>
          <p>"Amazing community experience!" - Member</p>
        </blockquote>
        <hr />
        <p><em>Best regards,</em><br />
        <em>Positiv Team</em></p>
      `

      const props = {
        subject: "Community Newsletter",
        content: mdxContent,
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      }

      const html = await render(<GeneralNews {...props} />)

      expect(html).toContain("Community Updates")
      expect(html).toContain("Amazing community experience!")
      expect(html).toContain("Best regards")
      expect(html).toContain("Positiv Team")
    })
  })

  describe("Common Features", () => {
    it("should have consistent Positiv branding in both templates", async () => {
      const props = {
        subject: "Test",
        content: "<p>Test</p>",
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      }

      const eventHtml = await render(<EventAnnouncement {...props} />)
      const newsHtml = await render(<GeneralNews {...props} />)

      // Both should include Positiv in title
      expect(eventHtml).toContain("Positiv")
      expect(newsHtml).toContain("Positiv")
    })

    it("should properly sanitize dangerous HTML in content", async () => {
      const props = {
        subject: "Security Test",
        content:
          '<script>alert("XSS")</script><p>Safe content</p><div onclick="alert(\'XSS\')">Click</div>',
        unsubscribeUrl: "https://positiv.com/unsubscribe",
      }

      const eventHtml = await render(<EventAnnouncement {...props} />)
      const newsHtml = await render(<GeneralNews {...props} />)

      // Script tags should be completely removed
      expect(eventHtml).not.toContain("<script")
      expect(eventHtml).not.toContain("alert")
      expect(newsHtml).not.toContain("<script")
      expect(newsHtml).not.toContain("alert")

      // Event handlers should be removed
      expect(eventHtml).not.toContain("onclick")
      expect(newsHtml).not.toContain("onclick")

      // Safe content should be preserved
      expect(eventHtml).toContain("Safe content")
      expect(newsHtml).toContain("Safe content")
    })
  })
})
