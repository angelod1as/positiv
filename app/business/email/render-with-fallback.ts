import { emailLogger as logger } from "./email-logger.server"

export function renderWithFallback<Copy, Rendered>(
  name: string,
  render: (copy: Copy) => Rendered,
  copy: Copy,
  fallback: Copy,
): Rendered {
  try {
    return render(copy)
  } catch (error) {
    // A failure with the code copy already in use is a real error — a refused
    // payment url, say — so let it propagate. Otherwise re-render with the code
    // copy: if that succeeds the CMS copy was at fault and we log it; if it
    // fails too, the fault was never the copy, so surface the original error.
    if (copy === fallback) throw error
    let rendered: Rendered
    try {
      rendered = render(fallback)
    } catch {
      throw error
    }
    logger.error(`The ${name} email copy failed to render, using the default`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return rendered
  }
}
