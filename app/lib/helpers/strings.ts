const PORTUGUESE_PARTICLES = ["da", "de", "do", "das", "dos", "e"]

export const toTitleCase = (str: string): string => {
  if (!str) return str

  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (!word) return word
      if (index > 0 && PORTUGUESE_PARTICLES.includes(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
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

  if (needsTitleCase(val)) {
    return toTitleCase(val)
  }
  return val
}
