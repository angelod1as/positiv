export function parseStringValue(
  input: string,
): number | boolean | string | undefined {
  if (!input) return undefined

  // Check for number
  const num = parseFloat(input)
  if (!isNaN(num) && num.toString() === input) {
    // Ensure the whole string is a number
    return num
  }

  // Check for boolean
  if (input.toLowerCase() === "true") {
    return true
  }
  if (input.toLowerCase() === "false") {
    return false
  }

  // Otherwise, return as string
  return input
}
