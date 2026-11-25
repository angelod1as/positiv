import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { defaultOnlinePaymentsSetting } from "~/test/online-payments-setting"

vi.mock("~/components/pages/admin/online-payments-section", () => ({
  OnlinePaymentsSection: () => <section aria-label="online payments" />,
}))
vi.mock("~/components/pages/admin/registration-limit-section", () => ({
  RegistrationLimitSection: () => <section aria-label="registration limit" />,
}))
vi.mock("~/components/pages/admin/likert-section", () => ({
  LikertSection: () => <section aria-label="likert" />,
}))
vi.mock("~/components/pages/admin/listmonk-diagnostic-section", () => ({
  ListmonkDiagnosticSection: () => <section aria-label="listmonk" />,
}))

import type { Route } from "./+types/settings-page"
import SettingsPage from "./settings-page"

type LoaderData = Route.ComponentProps["loaderData"]

const renderPage = (loaderData: LoaderData) =>
  render(
    <SettingsPage
      {...({ loaderData } as unknown as Route.ComponentProps)}
    />,
  )

const base = {
  cardPayments: false,
  registrationLimit: 120,
  likertEnabled: true,
  likertRequired: false,
}

describe("SettingsPage", () => {
  it("shows the payments section when the loader sent the payments settings", () => {
    renderPage({ ...base, onlinePayments: defaultOnlinePaymentsSetting })

    expect(
      screen.getByRole("region", { name: "online payments" }),
    ).toBeInTheDocument()
  })

  it("shows every other section without the payments settings", () => {
    renderPage({ ...base, onlinePayments: null })

    expect(
      screen.queryByRole("region", { name: "online payments" }),
    ).not.toBeInTheDocument()
    for (const name of ["registration limit", "likert", "listmonk"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument()
    }
  })
})
