import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LikertAnswerScale } from "./likert-answer-scale"

const points = () =>
  Array.from(document.querySelectorAll("[data-point]")) as HTMLElement[]

describe("LikertAnswerScale", () => {
  it.each([
    [1, "Discordo totalmente"],
    [2, "Discordo"],
    [3, "Depende"],
    [4, "Concordo"],
    [5, "Concordo totalmente"],
  ])("names answer %i as %s", (answer, label) => {
    render(<LikertAnswerScale answer={answer} />)

    expect(screen.getByText(label)).toBeVisible()
  })

  it("marks where the answer sits among the five points", () => {
    render(<LikertAnswerScale answer={2} />)

    expect(points().map((point) => point.dataset.selected)).toEqual([
      "false",
      "true",
      "false",
      "false",
      "false",
    ])
  })

  it("keeps the five points out of the screen reader, which reads the label", () => {
    const { container } = render(<LikertAnswerScale answer={4} />)

    expect(container.querySelector("[aria-hidden='true'] [data-point]")).not.toBeNull()
  })

  it.each([
    [1, "disagree"],
    [2, "disagree"],
    [3, "neutral"],
    [4, "agree"],
    [5, "agree"],
  ])("colours answer %i on the %s side", (answer, side) => {
    render(<LikertAnswerScale answer={answer} />)

    expect(screen.getByText(/Discordo|Depende|Concordo/).dataset.side).toBe(side)
  })
})
