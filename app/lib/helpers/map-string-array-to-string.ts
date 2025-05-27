// Function to convert string arrays to comma-separated strings within an object
export function mapToString(
  object: Record<string, string | number | string[] | number[] | null>,
) {
  const result: { [index: string]: string | number } = {}

  // Iterate over each key in the participant object
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      const value = object[key]
      if (value !== null) {
        // Check if the value is an array and join it if true, otherwise keep it as is
        result[key] = Array.isArray(value) ? value.join(", ") : value
      }
    }
  }

  return result
}
