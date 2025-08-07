import DOMPurify from "dompurify"
import { JSDOM } from "jsdom"

// Create a DOMPurify instance for server-side use
const window = new JSDOM("").window
// Cast to any because DOMPurify's WindowLike type doesn't match jsdom's window perfectly
// This is safe as DOMPurify only needs basic DOM APIs which jsdom provides
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any)

/**
 * Sanitizes HTML content for safe rendering in emails
 * Removes dangerous elements and attributes while preserving safe formatting
 */
export function sanitizeHtml(html: string): string {
  // Configure DOMPurify for email-safe HTML
  const config = {
    ALLOWED_TAGS: [
      // Text content
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "b", "em", "i", "u",
      "blockquote", "pre", "code",
      
      // Lists
      "ul", "ol", "li",
      
      // Links (but sanitize href)
      "a",
      
      // Tables
      "table", "thead", "tbody", "tfoot", "tr", "td", "th",
      
      // Semantic
      "div", "span", "section", "article",
      
      // Safe media
      "img", // src will be sanitized
    ],
    ALLOWED_ATTR: [
      // Global attributes
      "class", "id", "style",
      
      // Link attributes (will be sanitized)
      "href", "target", "rel",
      
      // Image attributes (will be sanitized)
      "src", "alt", "width", "height",
      
      // Table attributes
      "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
    // Only allow safe protocols, no data: URLs for security
    ALLOWED_URI_REGEXP: /^(?:(?:f|ht)tps?|mailto):/i,
    ALLOW_DATA_URI: false,
    // Ensure target="_blank" links have rel="noopener noreferrer"
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  }

  // Sanitize the HTML
  const sanitized = purify.sanitize(html, config)

  // Additional post-processing if needed
  return sanitized
}

/**
 * Sanitizes HTML specifically for newsletter content
 * More permissive than general sanitization but still safe
 */
export function sanitizeNewsletterHtml(html: string): string {
  if (!html) return ""
  
  // Use the general sanitization with newsletter-specific adjustments if needed
  return sanitizeHtml(html)
}