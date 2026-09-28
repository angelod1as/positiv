import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defaultOnlinePaymentsSetting } from "~/test/online-payments-setting"
import { OnlinePaymentsSection } from "./online-payments-section"

const submit = vi.hoisted(() => vi.fn())

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => ({ submit, state: "idle" }),
}))

type Setting = typeof defaultOnlinePaymentsSetting

const configured: Setting = {
  switchedOn: true,
  asaasConfigured: true,
  enabled: true,
  updatedAt: "2026-09-27T15:30:00.000Z",
  updatedByName: "Admin Souza",
}

const renderSection = (setting: Setting) =>
  render(<OnlinePaymentsSection setting={setting} />)

describe("OnlinePaymentsSection", () => {
  beforeEach(() => {
    submit.mockClear()
  })

  it("shows that online payments are on, and who switched them", () => {
    renderSection(configured)

    expect(
      screen.getByRole("heading", { name: "Pagamentos online" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Ligados")).toBeInTheDocument()
    expect(screen.getByText(/Alterado por Admin Souza em/)).toBeInTheDocument()
  })

  it("switches online payments off only after the admin confirms", async () => {
    const user = userEvent.setup()
    renderSection(configured)

    await user.click(
      screen.getByRole("button", { name: "Desligar pagamentos online" }),
    )
    expect(submit).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Desligar" }))

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-online-payments", enabled: "false" },
      { method: "POST" },
    )
  })

  it("switches online payments back on", async () => {
    const user = userEvent.setup()
    renderSection({
      ...configured,
      switchedOn: false,
      enabled: false,
    })

    expect(screen.getByText("Desligados")).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Ligar pagamentos online" }),
    )
    await user.click(screen.getByRole("button", { name: "Ligar" }))

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-online-payments", enabled: "true" },
      { method: "POST" },
    )
  })

  it("cannot be switched on while Asaas is not configured", () => {
    renderSection(defaultOnlinePaymentsSetting)

    expect(screen.getByText("Desligados")).toBeInTheDocument()
    expect(
      screen.getByText(/O Asaas não está configurado neste ambiente/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Ligar pagamentos online" }),
    ).toBeDisabled()
  })

  // Stored as on, but Asaas lost its keys: the effective state is off, and
  // offering to switch off what already reads as off would be a contradiction.
  it("offers nothing but a disabled switch-on while switched on without Asaas", () => {
    renderSection({ ...configured, asaasConfigured: false, enabled: false })

    expect(screen.getByText("Desligados")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Desligar pagamentos online" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Ligar pagamentos online" }),
    ).toBeDisabled()
  })
})
