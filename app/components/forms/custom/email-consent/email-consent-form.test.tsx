import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { EmailConsentForm } from "./email-consent-form"

const everythingOn = {
  registrationAlerts: true,
  newsletter: true,
  marketing: true,
}

const ALERTS_WARNING =
  "Sem isso, você não vai mais ser lembrade das festas. As inscrições costumam fechar rápido."

const renderForm = (
  overrides: Partial<Parameters<typeof EmailConsentForm>[0]> = {},
) => {
  const commit = vi.fn().mockResolvedValue({ ok: true })
  const onDone = vi.fn()
  render(
    <EmailConsentForm
      initialPreferences={everythingOn}
      commit={commit}
      onDone={onDone}
      {...overrides}
    />,
  )
  return { commit, onDone }
}

describe("EmailConsentForm", () => {
  it("says which emails cannot be turned off", () => {
    renderForm()

    expect(
      screen.getByText(/Sempre vamos te mandar e-mails sobre sua candidatura/),
    ).toBeInTheDocument()
  })

  it("opens on the preferences it is given", () => {
    renderForm({
      initialPreferences: {
        registrationAlerts: true,
        newsletter: false,
        marketing: false,
      },
    })

    expect(
      screen.getByRole("checkbox", { name: /avisade quando abrirem/ }),
    ).toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: /newsletter da Positiv/ }),
    ).not.toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: /divulgações e parcerias/ }),
    ).not.toBeChecked()
  })

  it("warns right away, before saving, when alerts are unticked", async () => {
    const user = userEvent.setup()
    renderForm()

    expect(screen.queryByText(ALERTS_WARNING)).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("checkbox", { name: /avisade quando abrirem/ }),
    )

    expect(screen.getByText(ALERTS_WARNING)).toBeInTheDocument()
  })

  it("saves the three choices, even with nothing changed", async () => {
    const user = userEvent.setup()
    const { commit, onDone } = renderForm()

    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(commit).toHaveBeenCalled())
    expect(commit.mock.calls[0][0]).toEqual(everythingOn)
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })
})
