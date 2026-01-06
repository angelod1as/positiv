import { describe, expect, it } from "vitest"
import { escapeHtml } from "./escape-html"

describe("escapeHtml", () => {
  describe("basic escaping", () => {
    it("should escape ampersand character", () => {
      expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry")
    })

    it("should escape less than character", () => {
      expect(escapeHtml("a < b")).toBe("a &lt; b")
    })

    it("should escape greater than character", () => {
      expect(escapeHtml("a > b")).toBe("a &gt; b")
    })

    it("should escape double quote character", () => {
      expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;")
    })

    it("should escape single quote character", () => {
      expect(escapeHtml("it's")).toBe("it&#39;s")
    })
  })

  describe("multiple characters", () => {
    it("should escape multiple special characters in one string", () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
      )
    })

    it("should escape all occurrences of the same character", () => {
      expect(escapeHtml("a & b & c")).toBe("a &amp; b &amp; c")
    })
  })

  describe("edge cases", () => {
    it("should return empty string when given empty string", () => {
      expect(escapeHtml("")).toBe("")
    })

    it("should return same string when no special characters present", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World")
    })

    it("should handle string with only special characters", () => {
      expect(escapeHtml("<>&\"'")).toBe("&lt;&gt;&amp;&quot;&#39;")
    })

    it("should handle unicode characters without escaping them", () => {
      expect(escapeHtml("Olá mundo & você")).toBe("Olá mundo &amp; você")
    })
  })

  describe("XSS prevention", () => {
    it("should escape script tags", () => {
      const malicious = "<script>alert('xss')</script>"
      const result = escapeHtml(malicious)
      expect(result).not.toContain("<script>")
      expect(result).toContain("&lt;script&gt;")
    })

    it("should escape event handlers in attributes", () => {
      const malicious = '<img onerror="alert(1)">'
      const result = escapeHtml(malicious)
      expect(result).not.toContain("<img")
      expect(result).toContain("&lt;img")
    })
  })
})
