# Client IP comes from Traefik

- Status: accepted
- Date: 2026-10-03
- Tags: architecture, infrastructure, security

## Context

The signup limit and the feedback limit count requests per client IP, and Turnstile is told
the visitor's IP. Every one of them is only as good as the address the app reads.

There is no Cloudflare in front of the site. `positivparty.com` resolves straight to the
Hostinger VPS, where Coolify's Traefik terminates TLS and proxies to the app container. The
feedback route once read `cf-connecting-ip`, a header nothing sets, so every visitor shared one
`"unknown"` bucket in production. Supabase has the same blind spot from the other side: signup
goes through this server, so Supabase's own per-IP limits see one client.

Traefik's entrypoints trust no forwarded headers (no `forwardedHeaders.insecure`, no
`forwardedHeaders.trustedIPs`). It drops the `X-Real-Ip` a client sends and writes the
connection's address there, and it appends that address to `X-Forwarded-For`, leaving whatever
the client claimed in the entries before it.

## Decision

`getClientIp` (`app/lib/helpers/get-client-ip.server.ts`) is the one place the app reads the
client IP. It reads `X-Real-Ip`, falls back to the last `X-Forwarded-For` entry, and answers
`null` otherwise. Nothing reads `cf-connecting-ip`.

This is trusted only because Traefik is the sole way in:

- the app container publishes no host port (`ports_mappings` is empty in Coolify);
- Traefik's entrypoints keep trusting no forwarded headers.

A missing address in production is logged as an error, since Traefik always sets one.

## Consequences

### Positive

- Per-IP limits count real visitors, and Turnstile gets the real address.
- One helper to change if the edge changes.

### Negative

- Publishing the container port, or setting `forwardedHeaders.insecure` or `trustedIPs` on
  Traefik, lets any client choose its own address and walk around every per-IP limit. Nothing
  in the app can detect a spoofed header, only a missing one.

### Neutral

- Putting Cloudflare in front later means changing `getClientIp` to read `cf-connecting-ip`
  and trusting Traefik's forwarded headers only from Cloudflare's ranges.

## Alternatives Considered

1. **Read `cf-connecting-ip`, as the feedback route did**
   - Pros: the usual header behind Cloudflare.
   - Cons: there is no Cloudflare; the header is never set and every visitor looks the same.

2. **First `X-Forwarded-For` entry**
   - Pros: the conventional "original client" position.
   - Cons: it is whatever the client sent; Traefik only vouches for the last entry.

3. **Put Cloudflare in front of the site**
   - Pros: a managed edge with its own rate limiting and bot rules.
   - Cons: a DNS and infrastructure change well beyond rate limiting signups.

## References

- POS-598: stop bot signups
