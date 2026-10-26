import { redact } from "./redact.server"

export interface RequestFacts {
  method: string
  url: string
  origin?: string
  host?: string
  xForwardedProto?: string
  xForwardedHost?: string
}

const MAX_HEADER_LENGTH = 200

// The headers that explain why the framework turned a request away — an
// Origin that does not match the URL the server saw, a proxy that dropped
// X-Forwarded-Proto. An allowlist, so a cookie or an Authorization header can
// never reach an alert.
const ALLOWED_HEADERS = {
  origin: "origin",
  host: "host",
  xForwardedProto: "x-forwarded-proto",
  xForwardedHost: "x-forwarded-host",
} as const

function cap(value: string): string {
  const redacted = redact(value)
  return redacted.length > MAX_HEADER_LENGTH
    ? `${redacted.slice(0, MAX_HEADER_LENGTH)}...`
    : redacted
}

export function requestFacts(request: Request, safePath: string): RequestFacts {
  const facts: RequestFacts = {
    method: request.method,
    url: `${new URL(request.url).origin}${safePath}`,
  }
  for (const [key, header] of Object.entries(ALLOWED_HEADERS)) {
    const value = request.headers.get(header)
    if (value !== null) facts[key as keyof typeof ALLOWED_HEADERS] = cap(value)
  }
  return facts
}
