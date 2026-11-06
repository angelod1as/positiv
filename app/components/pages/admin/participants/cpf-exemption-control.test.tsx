import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { CpfExemptionControl } from "./cpf-exemption-control"

const profileId = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

const renderControl = (
  cpfExempt: boolean,
  answer: Record<string, unknown> = { success: true },
) => {
  const received = vi.fn()
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <CpfExemptionControl profileId={profileId} cpfExempt={cpfExempt} />,
        action: async ({ request }) => {
          received(Object.fromEntries(await request.formData()))
          return answer
        },
      },
    ],
    { initialEntries: ["/"] },
  )
  render(<RouterProvider router={router} />)
  return received
}

describe("CpfExemptionControl", () => {
  it("asks before exempting, since the CPF is cleared and online charges stop", async () => {
    const user = userEvent.setup()
    const received = renderControl(false)

    await user.click(screen.getByRole("button", { name: "Marcar sem CPF" }))
    expect(received).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/será apagado/)

    await user.click(
      screen.getByRole("button", { name: "Marcar sem CPF", hidden: false }),
    )

    await waitFor(() =>
      expect(received).toHaveBeenCalledWith({
        intent: "update-profile-cpf-exempt",
        profileId,
        cpfExempt: "true",
      }),
    )
  })

  it("leaves the profile alone when the admin backs out", async () => {
    const user = userEvent.setup()
    const received = renderControl(false)

    await user.click(screen.getByRole("button", { name: "Marcar sem CPF" }))
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(received).not.toHaveBeenCalled()
  })

  it("shows an exempt profile as such and lifts the exemption", async () => {
    const user = userEvent.setup()
    const received = renderControl(true)

    expect(screen.getByText("Sem CPF / estrangeira")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Desmarcar sem CPF" }))

    await waitFor(() =>
      expect(received).toHaveBeenCalledWith({
        intent: "update-profile-cpf-exempt",
        profileId,
        cpfExempt: "false",
      }),
    )
  })

  it("says why the exemption was refused", async () => {
    const user = userEvent.setup()
    renderControl(false, {
      success: false,
      errors: [{ message: "Cancele a cobrança antes" }],
    })

    await user.click(screen.getByRole("button", { name: "Marcar sem CPF" }))
    await user.click(screen.getByRole("button", { name: "Marcar sem CPF" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cancele a cobrança antes",
    )
  })
})
