type CategoryRule<Category extends string> = {
  category: Category
  patterns: RegExp[]
}

const GENDER_RULES: CategoryRule<"trans" | "cis">[] = [
  {
    category: "trans",
    patterns: [
      /\btrans\b/,
      /\bnao binari[ae]\b/,
      /\bagener[ao]\b/,
      /\bagender\b/,
      /^travesti$/,
    ],
  },
  { category: "cis", patterns: [/\bcis\b/] },
]

const RACE_COLOR_RULES: CategoryRule<
  "white" | "yellow" | "indigenous" | "black" | "brown"
>[] = [
  { category: "white", patterns: [/\bbranc[ao]\b/] },
  { category: "yellow", patterns: [/\bamarel[ao]\b/] },
  { category: "indigenous", patterns: [/\bindigena\b/] },
  { category: "black", patterns: [/\bpret[ao]\b/] },
  { category: "brown", patterns: [/\bpard[ao]\b/] },
]

const ORIENTATION_RULES: CategoryRule<
  "biPan" | "homo" | "straight" | "aceDemi"
>[] = [
  { category: "biPan", patterns: [/^bissexual$/, /\bbi\b/, /\bpan\b/] },
  {
    category: "homo",
    patterns: [/\bgay\b/, /\bsapatao\b/, /\blesbica\b/, /\bhomo\b/],
  },
  { category: "straight", patterns: [/\bhetero\b/] },
  { category: "aceDemi", patterns: [/\bace\b/, /\bdemi\b/] },
]

function normalizeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function matchCategories<Category extends string>(
  value: string,
  rules: CategoryRule<Category>[],
): Category[] {
  const normalized = normalizeAccents(value)
  return rules
    .filter(({ patterns }) => patterns.some((p) => p.test(normalized)))
    .map(({ category }) => category)
}

export function classifySingleGender(
  genderString: string,
): "cis" | "trans" | "other" {
  return matchCategories(genderString, GENDER_RULES)[0] ?? "other"
}

export function classifySingleRaceColor(
  raceColorString: string,
): "white" | "yellow" | "indigenous" | "black" | "brown" | "other" {
  return matchCategories(raceColorString, RACE_COLOR_RULES)[0] ?? "other"
}

export function classifySingleOrientation(
  orientationString: string,
): ("straight" | "homo" | "biPan" | "aceDemi" | "other")[] {
  const matched = new Set(matchCategories(orientationString, ORIENTATION_RULES))
  const result: ("straight" | "homo" | "biPan" | "aceDemi" | "other")[] = []
  if (matched.has("biPan")) {
    result.push("biPan")
  }
  if (matched.has("homo") && !result.includes("biPan")) {
    result.push("homo")
  }
  if (
    matched.has("straight") &&
    !result.some((c) => c === "biPan" || c === "homo")
  ) {
    result.push("straight")
  }
  if (matched.has("aceDemi")) {
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
