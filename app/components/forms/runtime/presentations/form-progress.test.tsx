import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FormProgress } from "./form-progress"

describe("FormProgress", () => {
  it("shows the position as a bare fraction", () => {
    render(<FormProgress index={3} total={14} />)

    expect(screen.getByText("3/14")).toBeInTheDocument()
  })

  it("names what is progressing, which the value alone does not say", () => {
    render(<FormProgress index={3} total={14} />)

    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "Progresso do formulário",
    )
  })

  it("reports the position to assistive technology in words", () => {
    render(<FormProgress index={3} total={14} />)

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuemin", "1")
    expect(bar).toHaveAttribute("aria-valuemax", "14")
    expect(bar).toHaveAttribute("aria-valuenow", "3")
    expect(bar).toHaveAttribute("aria-valuetext", "Etapa 3 de 14")
  })

  it("announces each new position, which focus alone would not", () => {
    render(<FormProgress index={3} total={14} />)

    expect(screen.getByText("3/14")).toHaveAttribute("aria-live", "polite")
  })

  it("fills the bar to the share of the run already walked", () => {
    render(<FormProgress index={7} total={14} />)

    const bar = screen.getByRole("progressbar")
    expect(bar.firstElementChild).toHaveStyle({ width: "50%" })
  })
})
