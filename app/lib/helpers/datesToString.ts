export const datesToString = (
  data: Record<string, string | number | Date>,
): Record<string, string | number> =>
  Object.entries(data).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]:
        value instanceof Date
          ? value.toISOString().replace("T", " ").replace("Z", "+00")
          : value,
    }),
    {},
  )
