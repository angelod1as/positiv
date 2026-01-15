const PORTUGUESE_PARTICLES = ["da", "de", "do", "das", "dos", "e"]

const capitalizeWord = (word: string): string => {
  if (!word) return word
  return word
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-")
}

export const toTitleCase = (str: string): string => {
  if (!str) return str

  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word)
    .map((word, index) => {
      if (index > 0 && PORTUGUESE_PARTICLES.includes(word)) {
        return word
      }
      return capitalizeWord(word)
    })
    .join(" ")
}

export const needsTitleCase = (val: string): boolean => {
  if (!val) return false

  const lettersOnly = val.replace(/[^a-zA-ZÀ-ÿ]/g, "")
  if (lettersOnly.length <= 1) return false

  const isAllUpper = lettersOnly === lettersOnly.toUpperCase()
  const isAllLower = lettersOnly === lettersOnly.toLowerCase()

  return isAllUpper || isAllLower
}

export const normalizeName = (val: string): string => {
  if (!val) return val

  const trimmed = val.trim()
  if (!trimmed) return trimmed

  if (needsTitleCase(trimmed)) {
    return toTitleCase(trimmed)
  }
  return trimmed
}
