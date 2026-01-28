import { getTurnstileConfig } from "./get-turnstile-config.server"
import type { RequestLike } from "./is-test-environment.server"

export interface TurnstileVerificationResult {
  success: boolean
  error?: string
}

const TURNSTILE_TIMEOUT_MS = 5000

export async function verifyTurnstileToken(
  token: string,
  ip: string,
  request?: RequestLike,
): Promise<TurnstileVerificationResult> {
  try {
    const { secretKey } = getTurnstileConfig(request)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS)

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: ip,
        }),
        signal: controller.signal,
      },
    )

    clearTimeout(timeoutId)

    const data = (await response.json()) as {
      success: boolean
      "error-codes"?: string[]
    }

    return {
      success: data.success,
      error: data["error-codes"]?.join(", "),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
