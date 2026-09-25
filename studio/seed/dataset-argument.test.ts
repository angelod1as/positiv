import { describe, expect, it } from "vitest"

import { datasetArgument } from "./dataset-argument"

const node = ["/usr/bin/node", "seed/seed.ts"]

describe("datasetArgument", () => {
  it("reads --dataset followed by the name", () => {
    expect(datasetArgument([...node, "--dataset", "development"])).toBe(
      "development",
    )
  })

  it("reads --dataset=name", () => {
    expect(datasetArgument([...node, "--dataset=development"])).toBe(
      "development",
    )
  })

  it("refuses to pick a dataset on its own", () => {
    expect(() => datasetArgument(node)).toThrow(/--dataset/)
  })

  it("refuses a --dataset with no name after it", () => {
    expect(() => datasetArgument([...node, "--dataset"])).toThrow(/--dataset/)
    expect(() => datasetArgument([...node, "--dataset", "--other"])).toThrow(
      /--dataset/,
    )
  })

  it("refuses production unless asked for it explicitly", () => {
    expect(() => datasetArgument([...node, "--dataset", "production"])).toThrow(
      /--allow-production/,
    )
  })

  it("seeds production when --allow-production comes with it", () => {
    expect(
      datasetArgument([
        ...node,
        "--dataset",
        "production",
        "--allow-production",
      ]),
    ).toBe("production")
  })
})
