import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { GridSlot } from "~/components/forms/runtime/presentations/grid"
import { buildBasicDataQuestions } from "./build-basic-data-questions"
import { buildBasicDataLayout } from "./build-basic-data-layout"

describe("buildBasicDataLayout", () => {
  it("places every question the form asks", () => {
    const placed = buildBasicDataLayout().flatMap((slot) =>
      slot.kind === "question" ? [slot.id] : [],
    )

    expect(placed).toEqual(
      buildBasicDataQuestions().map((question) => question.id),
    )
  })

  it("keeps the widths the form has today", () => {
    const layout = buildBasicDataLayout()
    const widthOf = (id: string) =>
      layout.find((slot) => slot.kind === "question" && slot.id === id)?.span

    expect(widthOf("full_name")).toBe(5)
    expect(widthOf("social_name")).toBe(4)
    expect(widthOf("date_of_birth")).toBe(3)
    expect(widthOf("cpf")).toBe(4)
    expect(widthOf("rg")).toBe(4)
    expect(widthOf("rg_issuer")).toBe(4)
  })

  it("explains what the documents are for right before asking for them", () => {
    const layout = buildBasicDataLayout()
    const noteAt = layout.findIndex((slot) => slot.kind === "note")
    const cpfAt = layout.findIndex(
      (slot) => slot.kind === "question" && slot.id === "cpf",
    )

    expect(noteAt).toBe(cpfAt - 1)

    const note = layout[noteAt]
    if (note.kind !== "note") throw new Error("expected a note")

    render(<>{note.render}</>)
    expect(
      screen.getByText(/controle de entrada nos locais dos eventos/),
    ).toBeInTheDocument()
  })

  it("closes with what cor ou raça is and is not used for", () => {
    const layout = buildBasicDataLayout()
    const last = layout[layout.length - 1]
    if (last.kind !== "note") throw new Error("expected a note")

    render(<>{last.render}</>)
    expect(
      screen.getByText(/não utilizamos a informação de cor ou raça/i),
    ).toBeInTheDocument()
  })

  describe("the CPF exemption", () => {
    const links = {
      request: "https://wa.me/55?text=request",
      change: "https://wa.me/55?text=change",
    }

    const exemptionNote = (layout: GridSlot[]) => {
      const note = layout.find(
        (slot) => slot.kind === "note" && slot.id === "cpf_exemption",
      )
      if (note?.kind !== "note") throw new Error("no exemption note")
      return note
    }

    const renderNote = (
      layout: GridSlot[],
      answers: Record<string, unknown> = {},
      onAnswer = vi.fn(),
    ) => {
      const { render: draw } = exemptionNote(layout)
      render(
        <>
          {typeof draw === "function"
            ? draw({ answers, onAnswer, isBusy: false })
            : draw}
        </>,
      )
      return onAnswer
    }

    it("offers no way out when there is nobody to send the request about", () => {
      expect(
        buildBasicDataLayout().some(
          (slot) => slot.kind === "note" && slot.id === "cpf_exemption",
        ),
      ).toBe(false)
    })

    it("asks for an exemption on WhatsApp, in a new tab, and marks it asked", async () => {
      const onAnswer = renderNote(buildBasicDataLayout({ links }))

      const link = screen.getByRole("link", {
        name: "Não tenho CPF ou sou pessoa estrangeira",
      })
      expect(link).toHaveAttribute("href", links.request)
      expect(link).toHaveAttribute("target", "_blank")

      await userEvent.click(link)
      expect(onAnswer).toHaveBeenCalledWith("cpf_exempt_requested", true)
    })

    it("says the request waits on the organisation, and can be undone", async () => {
      const onAnswer = renderNote(buildBasicDataLayout({ links }), {
        cpf_exempt_requested: true,
      })

      expect(
        screen.getByText(/aguardando liberação da administração/i),
      ).toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Tenho CPF" }))
      expect(onAnswer).toHaveBeenCalledWith("cpf_exempt_requested", false)
    })

    it("tells an exempt profile how to change it, and asks for no CPF", () => {
      const layout = buildBasicDataLayout({ links, cpfExempt: true })
      renderNote(layout)

      expect(
        screen.getByRole("link", {
          name: "I don't have a CPF. Click to speak with management",
        }),
      ).toHaveAttribute("href", links.change)

      expect(
        layout.flatMap((slot) => (slot.kind === "question" ? [slot.id] : [])),
      ).toEqual(
        buildBasicDataQuestions({ cpfExempt: true }).map((question) => question.id),
      )
    })
  })
})
