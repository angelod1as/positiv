import { createHmac, randomBytes } from "crypto"

// Enforce secure secret in production
const UNSUBSCRIBE_SECRET = (() => {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret || secret === "default-secret-change-in-production") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("UNSUBSCRIBE_SECRET environment variable must be set in production")
    }
    // Use a development-only default for local testing
    console.warn("Warning: Using insecure default UNSUBSCRIBE_SECRET for development")
    return "dev-only-secret-do-not-use-in-production"
  }
  return secret
})()

const TOKEN_EXPIRY_HOURS = 24

interface TokenData {
  profileId: string
  timestamp: number
}

interface ValidationResult {
  valid: boolean
  profileId?: string
  error?: "invalid" | "expired"
}

export function generateUnsubscribeToken(profileId: string): string {
  const timestamp = Date.now()
  const nonce = randomBytes(16).toString("hex")
  const data: TokenData = { profileId, timestamp }
  
  const payload = JSON.stringify(data) + "." + nonce
  const signature = createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(payload)
    .digest("hex")
  
  const token = Buffer.from(`${payload}.${signature}`).toString("base64url")
  return token
}

export function parseUnsubscribeToken(token: string): TokenData | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const parts = decoded.split(".")
    
    if (parts.length !== 3) {
      return null
    }
    
    const [dataJson, nonce, signature] = parts
    const payload = `${dataJson}.${nonce}`
    
    const expectedSignature = createHmac("sha256", UNSUBSCRIBE_SECRET)
      .update(payload)
      .digest("hex")
    
    if (signature !== expectedSignature) {
      return null
    }
    
    const data: TokenData = JSON.parse(dataJson)
    return data
  } catch {
    return null
  }
}

export function validateUnsubscribeToken(token: string): ValidationResult {
  const parsed = parseUnsubscribeToken(token)
  
  if (!parsed) {
    return { valid: false, error: "invalid" }
  }
  
  const expiryTime = parsed.timestamp + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  if (Date.now() > expiryTime) {
    return { valid: false, error: "expired" }
  }
  
  return { valid: true, profileId: parsed.profileId }
}