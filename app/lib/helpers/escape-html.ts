/**
 * Escapes HTML special characters in a string to prevent XSS attacks.
 *
 * Converts the following characters to their HTML entity equivalents:
 * - & -> &amp;
 * - < -> &lt;
 * - > -> &gt;
 * - " -> &quot;
 * - ' -> &#39;
 *
 * @param text - The string to escape
 * @returns The escaped string safe for HTML rendering
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char])
}
