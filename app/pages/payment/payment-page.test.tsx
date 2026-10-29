import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithRouter } from "~/test/test-utils"
import { buildPaymentOptions } from "~/business/payment/pricing"
import { asaasConnector } from "~/business/payment/provider/asaas/asaas-connector.server"
import { paymentsCopy } from "~/copy/payments"
import PaymentPage from "./payment-page"
import type { PaymentPageData } from "./payment-page.server"

const { submit, navigationState, fetcherData } = vi.hoisted(() => ({
  submit: vi.fn(),
  navigationState: { value: "idle" },
  fetcherData: { value: undefined as unknown },
}))

// Form needs a data router to exist at all, which this page does not otherwise
// need; the test is about what the participant sees and submits, not about how
// React Router carries it.
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useFetcher: () => ({ submit, state: "idle", data: fetcherData.value }),
    useNavigation: () => ({ state: navigationState.value }),
    Form: ({
      children,
      ...props
    }: React.ComponentProps<"form">) => <form {...props}>{children}</form>,
  }
})

const options = buildPaymentOptions(25000, {
  cardEnabled: true,
  splitInstallments: asaasConnector.splitInstallments,
})

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
  baseAmount: 25000,
  options,
  chosen: null,
  invoiceUrl: null,
}

describe("PaymentPage", () => {
  it("says what the event costs, and nothing about fees", () => {
    renderPage(ready)

    expect(
      screen.getByText(/O valor do evento é R\$\s?250,00\./),
    ).toBeInTheDocument()
    expect(screen.queryByText(/taxa/i)).not.toBeInTheDocument()
  })

  it("names each option by its total and says what sets it apart", () => {
    renderPage(ready)

    expect(
      screen.getByRole("radio", { name: /^Pix R\$\s?225,00$/ }),
    ).toHaveAccessibleDescription(/10% de desconto sobre R\$\s?250,00/)

    expect(
      screen.getByRole("radio", { name: /^Cartão de crédito — 6x de R\$\s?41,66\* R\$\s?250,00$/ }),
    ).toHaveAccessibleDescription("")
    expect(screen.queryByText(/juros|última parcela/i)).not.toBeInTheDocument()

    expect(
      screen.getByRole("radio", { name: /^Cartão de crédito — à vista R\$\s?250,00$/ }),
    ).toHaveAccessibleDescription("")
  })

  it("warns that an installment may move by a cent at checkout", () => {
    renderPage(ready)

    expect(
      screen.getByText(
        "*O valor das parcelas pode variar em um centavo, para mais ou para menos, no site de pagamento.",
      ),
    ).toBeInTheDocument()
  })

  it("offers Pix alone while card payments are off", () => {
    renderPage({
      ...ready,
      options: buildPaymentOptions(25000, {
        cardEnabled: false,
        splitInstallments: asaasConnector.splitInstallments,
      }),
    })

    expect(screen.getAllByRole("radio")).toHaveLength(1)
    expect(
      screen.getByRole("radio", { name: /^Pix R\$\s?250,00$/ }),
    ).toHaveAccessibleDescription("")
    expect(screen.queryByText(/valor das parcelas/)).not.toBeInTheDocument()
  })

  it("lists every option with its price and defaults to Pix", () => {
    renderPage(ready)

    expect(
      screen.getByRole("radio", { name: /^Pix R\$\s?225,00$/ }),
    ).toBeChecked()
    expect(
      screen.getByRole("radio", { name: /Cartão de crédito — 3x de/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(7)
  })

  it("comes back with the option the participant already picked", () => {
    renderPage({
      ...ready,
      chosen: options.find((option) => option.id === "card_3") ?? null,
      invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
    })

    expect(screen.getByRole("radio", { name: /Cartão de crédito — 3x de/ })).toBeChecked()
    expect(screen.getByRole("radio", { name: /^Pix/ })).not.toBeChecked()
  })

  it("carries the chosen option to the server", async () => {
    renderPage(ready)

    await userEvent.click(screen.getByRole("radio", { name: /Cartão de crédito — 3x de/ }))

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
      providerName: "Asaas",
    })

    expect(
      screen.getByLabelText(paymentsCopy.page.cpfLabel),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/O pagamento é processado pelo Asaas/),
    ).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("refuses a CPF whose digits do not check out", async () => {
    renderPage({
      state: "needs_cpf",
      paymentId: "payment-1",
      eventTitle: "Encontro de Maio",
      providerName: "Asaas",
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

  // The client re-validates before posting, so the server only refuses for a
  // reason the client cannot see — an expired session, most of all. Going quiet
  // leaves the person clicking a button that appears to do nothing.
  it("says what went wrong when the server refuses the CPF", () => {
    fetcherData.value = { ok: false, error: "Sua sessão expirou." }
    renderPage({
      state: "needs_cpf",
      paymentId: "payment-1",
      eventTitle: "Encontro de Maio",
      providerName: "Asaas",
    })

    expect(screen.getByText("Sua sessão expirou.")).toBeInTheDocument()

    fetcherData.value = undefined
  })

  it("sends a CPF that checks out", async () => {
    renderPage({
      state: "needs_cpf",
      paymentId: "payment-1",
      eventTitle: "Encontro de Maio",
      providerName: "Asaas",
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

  // Only these two states exist while online payments are on — with the switch
  // off the loader answers closed — and both come before the participant pays.
  it.each([
    ["choosing an option", ready],
    [
      "asked for a CPF",
      { state: "needs_cpf", paymentId: "payment-1", eventTitle: "Encontro de Maio" },
    ],
  ] as [string, PaymentPageData][])(
    "warns that online payments are new while %s",
    (_, data) => {
      renderPage(data)

      expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
        "href",
        expect.stringContaining("https://wa.me/5511945970336"),
      )
    },
  )

  it.each([
    [
      "paid",
      {
        state: "paid",
        eventTitle: "Encontro de Maio",
        amount: 22199,
        paidAt: "2026-08-20T12:00:00Z",
      },
    ],
    ["closed", { state: "closed", eventTitle: "Encontro de Maio" }],
  ] as [string, PaymentPageData][])(
    "shows no beta notice once the link is %s",
    (_, data) => {
      renderPage(data)

      expect(
        screen.queryByRole("link", { name: "WhatsApp" }),
      ).not.toBeInTheDocument()
    },
  )

  describe("analytics", () => {
    const umamiTrack = vi.fn()

    beforeEach(() => {
      umamiTrack.mockClear()
      window.umami = { track: umamiTrack }
    })

    afterEach(() => {
      delete window.umami
    })

    // jsdom cannot submit a form, and says so loudly.
    const pay = async () => {
      const button = screen.getByRole("button", { name: paymentsCopy.page.pay })
      button
        .closest("form")
        ?.addEventListener("submit", (event) => event.preventDefault())
      await userEvent.click(button)
    }

    it("reports the page opened with what it offered", () => {
      renderPage(ready)

      expect(umamiTrack).toHaveBeenCalledWith("payment_page_opened", {
        state: "ready",
      })
    })

    it("reports the page opened on a link already paid", () => {
      renderPage({
        state: "paid",
        eventTitle: "Encontro de Maio",
        amount: 22199,
        paidAt: "2026-08-20T12:00:00Z",
      })

      expect(umamiTrack).toHaveBeenCalledWith("payment_page_opened", {
        state: "paid",
      })
    })

    it("reports Pix picked when the default goes through", async () => {
      renderPage(ready)

      await pay()

      expect(umamiTrack).toHaveBeenCalledWith("payment_method_picked", {
        method: "pix",
        installments: 1,
      })
    })

    it("reports the card and its installments when that is picked", async () => {
      renderPage(ready)

      await userEvent.click(
        screen.getByRole("radio", { name: /Cartão de crédito — 3x de/ }),
      )
      await pay()

      expect(umamiTrack).toHaveBeenCalledWith("payment_method_picked", {
        method: "credit_card",
        installments: 3,
      })
    })
  })
})
