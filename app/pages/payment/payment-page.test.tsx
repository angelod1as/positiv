import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { renderWithRouter } from "~/test/test-utils"
import {
  buildPaymentOptions,
  type AsaasFees,
} from "~/business/payment/pricing"
import { paymentsCopy } from "~/copy/payments"
import PaymentPage from "./payment-page"
import type { PaymentPageData } from "./payment-page.server"

const { submit, navigationState } = vi.hoisted(() => ({
  submit: vi.fn(),
  navigationState: { value: "idle" },
}))

// Form needs a data router to exist at all, which this page does not otherwise
// need; the test is about what the participant sees and submits, not about how
// React Router carries it.
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useFetcher: () => ({ submit, state: "idle", data: undefined }),
    useNavigation: () => ({ state: navigationState.value }),
    Form: ({
      children,
      ...props
    }: React.ComponentProps<"form">) => <form {...props}>{children}</form>,
  }
})

// The public price list, the same numbers asaas-fees falls back to. Inline
// because that module is server-only and this test runs in jsdom.
const fees: AsaasFees = {
  pix: { fixed: 199, percent: 0 },
  card: { fixed: 49, percentOneInstallment: 0.0299, percentUpToSix: 0.0349 },
  anticipation: { detachedMonthlyRate: 0.0115, installmentMonthlyRate: 0.016 },
}

const options = buildPaymentOptions(22000, fees)

// The page reads one prop of the many a route component is handed, and a test
// that built the rest would be describing React Router, not this page.
const Page = PaymentPage as unknown as (props: {
  loaderData: PaymentPageData
}) => React.ReactNode

const renderPage = (loaderData: PaymentPageData) =>
  renderWithRouter(<Page loaderData={loaderData} />)

const ready: PaymentPageData = {
  state: "ready",
  paymentId: "payment-1",
  eventTitle: "Encontro de Maio",
  eventEmoji: "🌻",
  dueAt: "2026-09-18T12:00:00Z",
  options,
  chosen: null,
  invoiceUrl: null,
}

describe("PaymentPage", () => {
  it("lists every option with its price and defaults to Pix", () => {
    renderPage(ready)

    expect(
      screen.getByRole("radio", { name: /Pix — R\$\s?221,99/ }),
    ).toBeChecked()
    expect(
      screen.getByRole("radio", { name: /Cartão 3x de/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(7)
  })

  it("comes back with the option the participant already picked", () => {
    renderPage({
      ...ready,
      chosen: options.find((option) => option.id === "card_3") ?? null,
      invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
    })

    expect(screen.getByRole("radio", { name: /Cartão 3x de/ })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Pix —/ })).not.toBeChecked()
  })

  it("carries the chosen option to the server", async () => {
    renderPage(ready)

    await userEvent.click(screen.getByRole("radio", { name: /Cartão 3x de/ }))

    const form = screen
      .getByRole("button", { name: paymentsCopy.page.pay })
      .closest("form")
    expect(form).toHaveAttribute("method", "post")
    expect(new FormData(form as HTMLFormElement).get("optionId")).toBe("card_3")
  })

  // A second submit opens a second Asaas charge, and only one of them can end
  // up on the row.
  it("stops taking clicks while the charge is being created", () => {
    navigationState.value = "submitting"
    renderPage(ready)

    expect(
      screen.getByRole("button", { name: paymentsCopy.page.pay }),
    ).toBeDisabled()

    navigationState.value = "idle"
  })

  it("shows the receipt when it is already paid", () => {
    renderPage({
      state: "paid",
      eventTitle: "Encontro de Maio",
      amount: 22199,
      paidAt: "2026-08-20T12:00:00Z",
    })

    expect(screen.getByText(paymentsCopy.page.paidTitle)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s?221,99/)).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: paymentsCopy.page.pay }),
    ).not.toBeInTheDocument()
  })

  it("explains a closed link without offering to pay", () => {
    renderPage({ state: "closed", eventTitle: "Encontro de Maio" })

    expect(screen.getByText(paymentsCopy.page.closedTitle)).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("asks for the CPF first when the profile has none", () => {
    renderPage({
      state: "needs_cpf",
      paymentId: "payment-1",
      eventTitle: "Encontro de Maio",
    })

    expect(
      screen.getByLabelText(paymentsCopy.page.cpfLabel),
    ).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("refuses a CPF whose digits do not check out", async () => {
    renderPage({
      state: "needs_cpf",
      paymentId: "payment-1",
      eventTitle: "Encontro de Maio",
    })

    await userEvent.type(
      screen.getByLabelText(paymentsCopy.page.cpfLabel),
      "111.111.111-11",
    )
    await userEvent.click(
      screen.getByRole("button", { name: paymentsCopy.page.cpfSubmit }),
    )

    expect(
      await screen.findByText(paymentsCopy.errors.invalidCpf),
    ).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it("sends a CPF that checks out", async () => {
    renderPage({
      state: "needs_cpf",
      paymentId: "payment-1",
      eventTitle: "Encontro de Maio",
    })

    await userEvent.type(
      screen.getByLabelText(paymentsCopy.page.cpfLabel),
      "529.982.247-25",
    )
    await userEvent.click(
      screen.getByRole("button", { name: paymentsCopy.page.cpfSubmit }),
    )

    expect(submit).toHaveBeenCalledWith(
      { cpf: "52998224725" },
      expect.objectContaining({ method: "post" }),
    )
  })
})
