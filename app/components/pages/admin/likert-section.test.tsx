import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LikertSection } from "./likert-section"

const submit = vi.hoisted(() => vi.fn())

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => ({ submit, state: "idle" }),
}))

const likertSwitch = () =>
  screen.getByRole("switch", { name: "Escala de Likert" })

describe("LikertSection", () => {
  beforeEach(() => {
    submit.mockClear()
  })

  it("shows whether the scale is on", () => {
    render(<LikertSection enabled />)

    expect(likertSwitch()).toBeChecked()
  })

  it.each([
    [false, "true"],
    [true, "false"],
  ])("when %s, flips the switch to %s", async (enabled, next) => {
    render(<LikertSection enabled={enabled} />)

    await userEvent.click(likertSwitch())

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-likert", enabled: next },
      { method: "POST" },
    )
  })
})
