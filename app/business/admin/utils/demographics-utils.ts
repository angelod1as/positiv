import { GENDERS } from "~/lib/helpers/constants"

// --- Gender Classification Helpers ---

function isCisGender(gender: string): boolean {
  const lower = gender.toLowerCase()
  return (
    (GENDERS.includes("Mulher cis") && lower === "mulher cis") ||
    (GENDERS.includes("Homem cis") && lower === "homem cis") ||
    /\bcis\b/i.test(lower)
  )
}

function isTransGender(gender: string): boolean {
  const lower = gender.toLowerCase()
  return (
    /\btrans\b/i.test(lower) ||
    lower === "travesti" ||
    lower === "mulher trans" ||
    lower === "homem trans"
  )
}

function isAgender(gender: string): boolean {
  const lower = gender.toLowerCase()
  return /\bag[êe]nero\b|\bagender\b|\bagênera\b/i.test(lower)
}

/**
 * Classifies a single gender string into a category.
 */
export function classifySingleGender(
  genderString: string,
): "cis" | "trans" | "agender" | "other" {
  if (isCisGender(genderString)) return "cis"
  if (isTransGender(genderString)) return "trans"
  if (isAgender(genderString)) return "agender"
  return "other"
}

// --- Orientation Classification Helpers ---

function isBiPan(orientation: string): boolean {
  const lower = orientation.toLowerCase()
  return (
    lower === "bi" ||
    lower === "pan" ||
    lower === "bissexual" ||
    /\bbi\b|\bpan\b/i.test(lower)
  )
}

function isHomo(orientation: string): boolean {
  const lower = orientation.toLowerCase()
  return (
    lower === "gay" ||
    lower === "sapatão" ||
    lower === "lésbica" ||
    /\bgay\b|\bsapatão\b|\bl[ée]sbica\b|\bhomo\b/i.test(lower)
  )
}

function isStraight(orientation: string): boolean {
  const lower = orientation.toLowerCase()
  return (
    lower === "hétero" ||
    lower === "hetero" ||
    /\bhet[ée]ro\b/i.test(lower)
  )
}

function isAceDemi(orientation: string): boolean {
  const lower = orientation.toLowerCase()
  return lower === "ace" || lower === "demi" || /\bace\b|\bdemi\b/i.test(lower)
}

/**
 * Classifies a single orientation string into one or more categories.
 */
export function classifySingleOrientation(
  orientationString: string,
): ("straight" | "homo" | "biPan" | "aceDemi" | "other")[] {
  const result: ("straight" | "homo" | "biPan" | "aceDemi" | "other")[] = []
  if (isBiPan(orientationString)) result.push("biPan")
  if (isHomo(orientationString) && !result.includes("biPan")) result.push("homo")
  if (isStraight(orientationString) && !result.some(c => ["biPan", "homo"].includes(c))) result.push("straight")
  if (isAceDemi(orientationString)) result.push("aceDemi")
  if (result.length === 0) result.push("other")
  // Special case: only aceDemi, no primary
  if (
    result.length === 1 &&
    result[0] === "aceDemi" &&
    !result.some(c => ["straight", "homo", "biPan"].includes(c))
  ) {
    result.unshift("other")
  }
  // Remove 'other' if other categories exist
  const unique = [...new Set(result)]
  if (unique.length > 1 && unique.includes("other")) {
    return unique.filter(c => c !== "other")
  }
  return unique
}

// --- Age and Average Calculation ---

/**
 * Calculates age from a date of birth string (YYYY-MM-DD).
 */
export function calculateAge(dateOfBirthString: string): number | null {
  const dob = new Date(dateOfBirthString)
  if (isNaN(dob.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age
}

/**
 * Calculates the integer average of an array of numbers, or null if empty.
 */
export function calculateAverage(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  return Math.floor(numbers.reduce((sum, num) => sum + num, 0) / numbers.length)
}
