type AnyObject = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export function nullToUndefined(obj: AnyObject): AnyObject {
  const result: AnyObject = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      if (value === null) {
        result[key] = undefined
      } else if (typeof value === "object" && value !== null) {
        result[key] = nullToUndefined(value)
      } else {
        result[key] = value
      }
    }
  }

  return result
}
