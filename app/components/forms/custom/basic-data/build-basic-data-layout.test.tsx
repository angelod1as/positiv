import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
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
})
