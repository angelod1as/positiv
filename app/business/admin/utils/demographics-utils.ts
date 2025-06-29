import { GENDERS } from "~/lib/helpers/constants"

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
    /\btrans\b|\bnão binári[ae]\b/i.test(lower) ||
    lower === "travesti" ||
    lower === "mulher trans" ||
    lower === "homem trans"
  )
}

function isAgender(gender: string): boolean {
  const lower = gender.toLowerCase()
  return /\bag[êe]nero\b|\bagender\b|\bagênera\b/i.test(lower)
}

export function classifySingleGender(
  genderString: string,
): "cis" | "trans" | "agender" | "other" {
  if (isCisGender(genderString)) {
    return "cis"
  }
  if (isTransGender(genderString)) {
    return "trans"
  }
  if (isAgender(genderString)) {
    return "agender"
  }
  return "other"
}

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
    lower === "hétero" || lower === "hetero" || /\bhet[ée]ro\b/i.test(lower)
  )
}

function isAceDemi(orientation: string): boolean {
  const lower = orientation.toLowerCase()
  return lower === "ace" || lower === "demi" || /\bace\b|\bdemi\b/i.test(lower)
}

export function classifySingleOrientation(
  orientationString: string,
): ("straight" | "homo" | "biPan" | "aceDemi" | "other")[] {
  const result: ("straight" | "homo" | "biPan" | "aceDemi" | "other")[] = []
  if (isBiPan(orientationString)) {
    result.push("biPan")
  }
  if (isHomo(orientationString) && !result.includes("biPan")) {
    result.push("homo")
  }
  if (
    isStraight(orientationString) &&
    !result.some((c) => c === "biPan" || c === "homo")
  ) {
    result.push("straight")
  }
  if (isAceDemi(orientationString)) {
    result.push("aceDemi")
  }
  if (result.length === 0) {
    result.push("other")
  }
  if (
    result.length === 1 &&
    result[0] === "aceDemi" &&
    !result.some((c) => c === "biPan" || c === "homo" || c === "straight")
  ) {
    result.unshift("other")
  }
  const uniqueResult = [...new Set(result)]
  return uniqueResult.length > 1 && uniqueResult.includes("other")
    ? uniqueResult.filter((c) => c !== "other")
    : uniqueResult
}

export function calculateAge(dateOfBirthString: string): number | null {
  const dob = new Date(dateOfBirthString)
  if (isNaN(dob.getTime())) {
    return null
  }
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDifference = now.getMonth() - dob.getMonth()
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && now.getDate() < dob.getDate())
  ) {
    age--
  }
  return age
}

export function calculateAverage(numbers: number[]): number | null {
  if (numbers.length === 0) {
    return null
  }
  const sum = numbers.reduce((total, value) => total + value, 0)
  return Math.floor(sum / numbers.length)
}
