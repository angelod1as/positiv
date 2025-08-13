import { createHmac, randomBytes } from "crypto"

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || "default-secret-change-in-production"
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