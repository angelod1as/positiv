export function resolveDataset(value: string | undefined): string {
  return value || "development"
}

export const dataset = resolveDataset(process.env.SANITY_STUDIO_DATASET)
