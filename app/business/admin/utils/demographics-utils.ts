import { GENDERS } from "~/lib/helpers/constants"

// Helper to classify a single gender string
export function classifySingleGender(
  genderString: string,
): "cis" | "trans" | "agender" | "other" {
  const lowerCaseGender = genderString.toLowerCase()

  // Strict matches first using the enum values for precision
  if (GENDERS.includes("Mulher cis") && lowerCaseGender === "mulher cis")
    return "cis"
  if (GENDERS.includes("Homem cis") && lowerCaseGender === "homem cis")
    return "cis"

  // Regex for common variations and custom inputs
  if (/\bcis\b/i.test(lowerCaseGender)) return "cis"

  // Transgender, Travesti, Homem trans, Mulher trans
  if (
    /\btrans\b/i.test(lowerCaseGender) ||
    lowerCaseGender === "travesti" ||
    lowerCaseGender === "mulher trans" ||
    lowerCaseGender === "homem trans"
  )
    return "trans"

  // Agender
  if (/\bag[êe]nero\b|\bagender\b|\bagênera\b/i.test(lowerCaseGender))
    return "agender"

  return "other"
}

// Helper to classify a single orientation string and return potentially multiple categories
export function classifySingleOrientation(
  orientationString: string,
): ("straight" | "homo" | "biPan" | "aceDemi" | "other")[] {
  const lowerCaseOrientation = orientationString.toLowerCase()
  const classifications: (
    | "straight"
    | "homo"
    | "biPan"
    | "aceDemi"
    | "other"
  )[] = []

  // High priority: Bi/Pan
  if (
    lowerCaseOrientation === "bi" ||
    lowerCaseOrientation === "pan" ||
    lowerCaseOrientation === "bissexual" ||
    /\bbi\b|\bpan\b/i.test(lowerCaseOrientation)
  ) {
    classifications.push("biPan")
  }

  // Next priority: Homo (Gay/Sapatão/Lésbica)
  // Only add if not already covered by bi/pan for primary classification
  if (
    lowerCaseOrientation === "gay" ||
    lowerCaseOrientation === "sapatão" ||
    lowerCaseOrientation === "lésbica" ||
    /\bgay\b|\bsapatão\b|\bl[ée]sbica\b|\bhomo\b/i.test(lowerCaseOrientation)
  ) {
    if (!classifications.includes("biPan")) {
      // Don't add homo if already classified as biPan (primary rule)
      classifications.push("homo")
    }
  }

  // Next priority: Straight
  if (
    lowerCaseOrientation === "hétero" ||
    lowerCaseOrientation === "hetero" ||
    /\bhet[ée]ro\b/i.test(lowerCaseOrientation)
  ) {
    if (
      !classifications.includes("biPan") &&
      !classifications.includes("homo")
    ) {
      // Only add straight if not biPan or homo
      classifications.push("straight")
    }
  }

  // Secondary classification: Ace/Demi. This can exist alongside a primary orientation.
  if (
    lowerCaseOrientation === "ace" ||
    lowerCaseOrientation === "demi" ||
    /\bace\b|\bdemi\b/i.test(lowerCaseOrientation)
  ) {
    classifications.push("aceDemi")
  }

  // If no specific classification was made yet, it's 'other' for primary
  if (classifications.length === 0) {
    classifications.push("other")
  } else if (
    classifications.length === 1 &&
    classifications[0] === "aceDemi" && // If only aceDemi, it still needs a primary 'other' if nothing else fit
    !classifications.includes("straight") &&
    !classifications.includes("homo") &&
    !classifications.includes("biPan")
  ) {
    // If only aceDemi was found, and no primary (straight, homo, biPan), add 'other' as primary.
    // This ensures ace/demi people who don't fit other primary categories are still counted.
    if (
      !classifications.some((c) => ["straight", "homo", "biPan"].includes(c))
    ) {
      classifications.unshift("other") // Add 'other' at the beginning as the primary fallback
    }
  }

  // Ensure 'other' is only present if nothing else matched, or as a primary fallback
  const uniqueClassifications = [...new Set(classifications)]
  if (
    uniqueClassifications.length > 1 &&
    uniqueClassifications.includes("other")
  ) {
    return uniqueClassifications.filter((c) => c !== "other") // Remove 'other' if other classifications exist
  }

  return uniqueClassifications
}

// Helper for age calculation
export function calculateAge(dateOfBirthString: string): number | null {
  const dob = new Date(dateOfBirthString)
  if (isNaN(dob.getTime())) {
    return null // Invalid date
  }
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--
  }
  return age
}

// Helper for average calculation
export function calculateAverage(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  return Math.floor(numbers.reduce((sum, num) => sum + num, 0) / numbers.length)
}
