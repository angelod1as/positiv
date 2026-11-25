import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LikertSection } from "./likert-section"

const submit = vi.hoisted(() => vi.fn())

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => ({ submit, state: "idle" }),
}))

const accessSwitch = () =>
  screen.getByRole("switch", { name: "Acessível por link" })
const requiredSwitch = () => screen.getByRole("switch", { name: "Obrigatória" })

describe("LikertSection", () => {
  beforeEach(() => {
    submit.mockClear()
  })

  it("shows each switch as it is", () => {
    render(<LikertSection enabled required={false} />)

    expect(accessSwitch()).toBeChecked()
    expect(requiredSwitch()).not.toBeChecked()
  })

  it.each([
    [false, "true"],
    [true, "false"],
  ])("when access is %s, flips it to %s", async (enabled, next) => {
    render(<LikertSection enabled={enabled} required={false} />)

    await userEvent.click(accessSwitch())

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-likert", enabled: next },
      { method: "POST" },
    )
  })

  it.each([
    [false, "true"],
    [true, "false"],
  ])("when required is %s, flips it to %s", async (required, next) => {
    render(<LikertSection enabled={false} required={required} />)

    await userEvent.click(requiredSwitch())

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-likert-required", enabled: next },
      { method: "POST" },
    )
  })
})
