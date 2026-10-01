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
  providerName: "Asaas",
  providerConfigured: true,
  enabled: true,
  updatedAt: "2026-09-27T15:30:00.000Z",
  updatedByName: "Admin Souza",
}

const off: Setting = { ...configured, switchedOn: false, enabled: false }

const renderSection = (setting: Setting, cardEnabled = false) =>
  render(<OnlinePaymentsSection setting={setting} cardEnabled={cardEnabled} />)

const onlineSwitch = () =>
  screen.getByRole("switch", { name: "Pagamentos online" })
const cardSwitch = () =>
  screen.queryByRole("switch", { name: "Cartão de crédito" })

describe("OnlinePaymentsSection", () => {
  beforeEach(() => {
    submit.mockClear()
  })

  it("shows online payments as a switch, and who changed the settings", () => {
    renderSection(configured)

    expect(screen.getByRole("heading", { name: "Pagamentos" })).toBeInTheDocument()
    expect(onlineSwitch()).toBeChecked()
    expect(screen.getByText(/Alterado por Admin Souza em/)).toBeInTheDocument()
  })

  it("switches online payments on at once", async () => {
    renderSection(off)

    expect(onlineSwitch()).not.toBeChecked()
    await userEvent.click(onlineSwitch())

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-online-payments", enabled: "true" },
      { method: "POST" },
    )
  })

  // Off stops new charges for everyone, so it asks first -- and says what it
  // does not do.
  it("switches online payments off only after the admin confirms", async () => {
    renderSection(configured)

    await userEvent.click(onlineSwitch())
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /não cancela/i,
    )

    await userEvent.click(screen.getByRole("button", { name: "Desligar" }))

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-online-payments", enabled: "false" },
      { method: "POST" },
    )
  })

  it("keeps online payments on when the admin backs out", async () => {
    renderSection(configured)

    await userEvent.click(onlineSwitch())
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(submit).not.toHaveBeenCalled()
  })

  it("offers the card switch under online payments while they are on", () => {
    renderSection(configured, true)

    expect(cardSwitch()).toBeChecked()
  })

  it("hides the card switch while online payments are off", () => {
    renderSection(off, true)

    expect(cardSwitch()).not.toBeInTheDocument()
  })

  it.each([
    [false, "true"],
    [true, "false"],
  ])("flips card payments at once (from %s)", async (cardEnabled, next) => {
    renderSection(configured, cardEnabled)

    await userEvent.click(cardSwitch() as HTMLElement)

    expect(submit).toHaveBeenCalledWith(
      { intent: "set-card-payments", enabled: next },
      { method: "POST" },
    )
  })

  it("cannot be switched on while Asaas is not configured", () => {
    renderSection(defaultOnlinePaymentsSetting)

    expect(onlineSwitch()).toBeDisabled()
    expect(
      screen.getByText(/O Asaas não está configurado neste ambiente/),
    ).toBeInTheDocument()
  })

  // Stored as on, but Asaas lost its keys: the effective state is off.
  it("reads as off while switched on without Asaas", () => {
    renderSection({ ...configured, providerConfigured: false, enabled: false }, true)

    expect(onlineSwitch()).not.toBeChecked()
    expect(onlineSwitch()).toBeDisabled()
    expect(cardSwitch()).not.toBeInTheDocument()
  })

  // The migration creates the row, which stamps updated_at with no one behind
  // it. "Changed at" with nobody who changed it is the migration talking.
  it("says nothing about the last change until an admin makes one", () => {
    renderSection({ ...configured, updatedByName: null })

    expect(screen.queryByText(/Alterado/)).not.toBeInTheDocument()
  })
})
