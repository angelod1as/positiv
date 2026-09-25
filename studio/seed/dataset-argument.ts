export function datasetArgument(argv: string[]): string {
  const index = argv.findIndex(
    (argument) => argument === "--dataset" || argument.startsWith("--dataset="),
  )
  const dataset =
    index === -1
      ? undefined
      : argv[index].includes("=")
        ? argv[index].slice("--dataset=".length)
        : argv[index + 1]

  if (!dataset || dataset.startsWith("--")) {
    throw new Error(
      "Name the dataset to seed: pnpm --filter studio seed --dataset development",
    )
  }

  if (dataset === "production" && !argv.includes("--allow-production")) {
    throw new Error(
      "Seeding production overwrites what Editors published there. Add --allow-production if that is the intent.",
    )
  }

  return dataset
}
