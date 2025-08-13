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

      const result = await processMDXContent(mdxContent)

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

      const result = await processMDXContent(mdxContent)

      expect(result.html).toContain("Summer Party")
      expect(result.html).toContain("Date:")
      expect(result.html).toContain("2025-02-15")
      expect(result.html).toContain("Location:")
      expect(result.html).toContain("São Paulo")
      expect(result.html).toContain("Spots:")
      expect(result.html).toContain("50")
      
      // Plain text should also include the event details
      expect(result.text).toContain("Summer Party")
      expect(result.text).toContain("2025-02-15")
    })

    it("should handle custom Button component", async () => {
      const mdxContent = `
<Button href="https://positiv.com/events">View All Events</Button>
      `.trim()

      const result = await processMDXContent(mdxContent)

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

      const result = await processMDXContent(mdxContent)

      expect(result.html).toContain("<hr")
      expect(result.text).toContain("---") // Plain text representation of divider
    })

    it("should handle custom Quote component", async () => {
      const mdxContent = `
<Quote author="Angelo">
  Life is beautiful when shared with amazing people.
</Quote>
      `.trim()

      const result = await processMDXContent(mdxContent)

      expect(result.html).toContain("Life is beautiful")
      expect(result.html).toContain("Angelo")
      
      expect(result.text).toContain("Life is beautiful")
      expect(result.text).toContain("- Angelo")
    })

    it("should throw error for unknown components", async () => {
      const invalidMdx = `
# Valid heading

<InvalidComponent>
  This component doesn't exist
</InvalidComponent>

More valid content
      `.trim()

      // With the VM sandbox security improvement, unknown components will throw an error
      // This is safer than silently rendering unknown components
      await expect(processMDXContent(invalidMdx))
        .rejects
        .toThrow('Expected component')
    })

    it("should throw error for malformed MDX syntax", async () => {
      const malformedMdx = `
# Heading

<Button href="test"
  This is malformed MDX
      `.trim()

      await expect(processMDXContent(malformedMdx))
        .rejects
        .toThrow()
    })

    it("should process MDX content correctly", async () => {
      const content = "# Test Content"

      const result = await processMDXContent(content)

      expect(result.html).toBeDefined()
      expect(result.text).toBeDefined()
      
      // Should process the content correctly
      expect(result.html).toContain("Test Content")
      expect(result.text).toContain("Test Content")
    })

    it("should block JavaScript expressions for security", async () => {
      const mdxWithExpression = `
# Hello

{console.log("This should not execute")}

More content
      `.trim()

      await expect(processMDXContent(mdxWithExpression))
        .rejects
        .toThrow('JavaScript expressions are not allowed')
    })

    it("should block import statements for security", async () => {
      const mdxWithImport = `
import fs from 'fs'

# Content

This should not work
      `.trim()

      await expect(processMDXContent(mdxWithImport))
        .rejects
        .toThrow('JavaScript expressions are not allowed')
    })

    it("should sanitize button href to prevent XSS", async () => {
      const mdxWithXSS = `
<Button href="javascript:alert('XSS')">Click me</Button>
      `.trim()

      const result = await processMDXContent(mdxWithXSS)
      
      // Should sanitize the javascript: URL to #
      expect(result.html).not.toContain('javascript:')
      expect(result.html).toContain('href="#"')
    })
  })
})