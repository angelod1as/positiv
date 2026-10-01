type PhoneValue = string | number | null | undefined

// Anatel's area codes. A number shaped like a mobile under a DDD that does not
// exist is a typo, and Asaas refuses it like one.
const BRAZILIAN_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
])

const digitsOf = (phone: PhoneValue) => String(phone ?? "").replace(/\D/g, "")

export function isBrazilianMobile(phone: PhoneValue): boolean {
  const digits = digitsOf(phone)
  return (
    /^\d{2}9\d{8}$/.test(digits) && BRAZILIAN_DDDS.has(Number(digits.slice(0, 2)))
  )
}

/**
 * A Brazilian mobile, or — for someone who said so — a country code and number
 * the way E.164 counts them. An international number starting with 55 is a
 * Brazilian one wearing its country code, and belongs in the other branch.
 */
export function isValidPhone(
  phone: PhoneValue,
  isInternational: boolean,
): boolean {
  if (!isInternational) return isBrazilianMobile(phone)
  const digits = digitsOf(phone)
  return /^[1-9]\d{7,14}$/.test(digits) && !digits.startsWith("55")
}
