import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CardPaymentsSection } from "./card-payments-section"

const submit = vi.hoisted(() => vi.fn())

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => ({ submit, state: "idle" }),
}))

describe("CardPaymentsSection", () => {
  beforeEach(() => {
    submit.mockClear()
  })

  it("shows that card payments are on", () => {
    render(<CardPaymentsSection enabled />)

    expect(
      screen.getByRole("heading", { name: "Cartão de crédito" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Ligado")).toBeInTheDocument()
  })

  it("switches card payments off only after the admin confirms", async () => {
    const user = userEvent.setup()
    render(<CardPaymentsSection enabled />)

    await user.click(
      screen.getByRole("button", { name: "Desligar cartão de crédito" }),
    )
    expect(submit).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Desligar" }))

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-card-payments", enabled: "false" },
      { method: "POST" },
    )
  })

  it("switches card payments back on", async () => {
    const user = userEvent.setup()
    render(<CardPaymentsSection enabled={false} />)

    expect(screen.getByText("Desligado")).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Ligar cartão de crédito" }),
    )
    await user.click(screen.getByRole("button", { name: "Ligar" }))

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-card-payments", enabled: "true" },
      { method: "POST" },
    )
  })
})
