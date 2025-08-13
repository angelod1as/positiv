import { describe, it, expect } from "vitest"
import { processMDXContent } from "./mdx-processor"

describe("mdx-processor", () => {
  describe("processMDXContent", () => {
    it("should convert basic MDX content to HTML and plain text", async () => {
      const mdxContent = `
# Hello World

This is a **bold** paragraph with *italic* text.

- Item 1
- Item 2
      `.trim()

      const result = await processMDXContent(mdxContent, "event-announcement")

      expect(result).toBeDefined()
      expect(result.html).toBeDefined()
      expect(result.text).toBeDefined()
      
      // Check HTML contains expected elements
      expect(result.html).toContain("<h1>Hello World</h1>")
      expect(result.html).toContain("<strong>bold</strong>")
      expect(result.html).toContain("<em>italic</em>")
      expect(result.html).toContain("<ul>")
      expect(result.html).toContain("<li>Item 1</li>")
      
      // Check plain text conversion
      expect(result.text).toContain("Hello World")
      expect(result.text).toContain("bold")
      expect(result.text).toContain("italic")
      expect(result.text).toContain("Item 1")
      expect(result.text).not.toContain("<")
      expect(result.text).not.toContain(">")
    })

    it("should handle custom EventCard component", async () => {
      const mdxContent = `
# Event Announcement

<EventCard 
  title="Summer Party" 
  date="2025-02-15" 
  location="São Paulo" 
  spots={50} 
/>

Join us for an amazing night!
      `.trim()

      const result = await processMDXContent(mdxContent, "event-announcement")

      expect(result.html).toContain("Summer Party")
      expect(result.html).toContain("2025-02-15")
      expect(result.html).toContain("São Paulo")
      expect(result.html).toContain("50")
      
      // Plain text should also include the event details
      expect(result.text).toContain("Summer Party")
      expect(result.text).toContain("2025-02-15")
    })

    it("should handle custom Button component", async () => {
      const mdxContent = `
<Button href="https://positiv.com/events">View All Events</Button>
      `.trim()

      const result = await processMDXContent(mdxContent, "general-news")

      expect(result.html).toContain('href="https://positiv.com/events"')
      expect(result.html).toContain("View All Events")
      
      expect(result.text).toContain("View All Events")
      expect(result.text).toContain("https://positiv.com/events")
    })

    it("should handle custom Divider component", async () => {
      const mdxContent = `
First section

<Divider />

Second section
      `.trim()

      const result = await processMDXContent(mdxContent, "general-news")

      expect(result.html).toContain("<hr")
      expect(result.text).toContain("---") // Plain text representation of divider
    })

    it("should handle custom Quote component", async () => {
      const mdxContent = `
<Quote author="Angelo">
  Life is beautiful when shared with amazing people.
</Quote>
      `.trim()

      const result = await processMDXContent(mdxContent, "general-news")

      expect(result.html).toContain("Life is beautiful")
      expect(result.html).toContain("Angelo")
      
      expect(result.text).toContain("Life is beautiful")
      expect(result.text).toContain("- Angelo")
    })

    it("should handle invalid MDX gracefully", async () => {
      const invalidMdx = `
# Valid heading

<InvalidComponent>
  This component doesn't exist
</InvalidComponent>

More valid content
      `.trim()

      const result = await processMDXContent(invalidMdx, "event-announcement")

      // Should still process valid content
      expect(result.html).toContain("Valid heading")
      expect(result.html).toContain("More valid content")
      
      // Invalid component should be rendered as text or ignored
      expect(result.text).toContain("Valid heading")
      expect(result.text).toContain("More valid content")
    })

    it("should throw error for malformed MDX syntax", async () => {
      const malformedMdx = `
# Heading

<Button href="test"
  This is malformed MDX
      `.trim()

      await expect(processMDXContent(malformedMdx, "event-announcement"))
        .rejects
        .toThrow()
    })

    it("should support both template types", async () => {
      const content = "# Test Content"

      const eventResult = await processMDXContent(content, "event-announcement")
      const newsResult = await processMDXContent(content, "general-news")

      expect(eventResult.html).toBeDefined()
      expect(newsResult.html).toBeDefined()
      
      // Both should process the same content
      expect(eventResult.html).toContain("Test Content")
      expect(newsResult.html).toContain("Test Content")
    })
  })
})