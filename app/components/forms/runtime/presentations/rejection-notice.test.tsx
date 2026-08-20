import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { formRuntimeCopy } from "~/copy/forms"
import { RejectionNotice } from "./rejection-notice"

type ScreenProps = {
  rejection: { questionIds: string[] } | null
  errors: Record<string, string>
}

const Screen = ({ rejection, errors }: ScreenProps) => (
  <form>
    <div data-question-id="nome">
      <input id="nome" aria-label="Nome" />
    </div>

    <div data-question-id="cor">
      <div role="radiogroup" aria-label="Cor">
        <input type="radio" name="cor" aria-label="Azul" />
        <input type="radio" name="cor" aria-label="Verde" />
      </div>
    </div>

    <RejectionNotice rejection={rejection} errors={errors} />
    <button type="submit">{"Continuar"}</button>
  </form>
)

describe("RejectionNotice", () => {
  it("says nothing while no advance has been refused", () => {
    render(<Screen rejection={null} errors={{}} />)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("warns once an advance was refused", () => {
    render(
      <Screen
        rejection={{ questionIds: ["nome"] }}
        errors={{ nome: "Resposta obrigatória" }}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      formRuntimeCopy.fieldsRejected,
    )
  })

  it("goes quiet once the refused questions carry no error", () => {
    const { rerender } = render(
      <Screen
        rejection={{ questionIds: ["nome"] }}
        errors={{ nome: "Resposta obrigatória" }}
      />,
    )

    rerender(<Screen rejection={{ questionIds: ["nome"] }} errors={{}} />)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("takes focus to the first refused field", () => {
    render(
      <Screen
        rejection={{ questionIds: ["nome"] }}
        errors={{ nome: "Resposta obrigatória" }}
      />,
    )

    expect(screen.getByLabelText("Nome")).toHaveFocus()
  })

  it("reaches into a choice group, which carries the id on no control", () => {
    render(
      <Screen
        rejection={{ questionIds: ["cor"] }}
        errors={{ cor: "Escolha uma opção" }}
      />,
    )

    expect(screen.getByLabelText("Azul")).toHaveFocus()
  })

  it("takes focus back on a second refusal of the same field", () => {
    const props = {
      rejection: { questionIds: ["nome"] },
      errors: { nome: "Resposta obrigatória" },
    }
    const { rerender } = render(<Screen {...props} />)

    screen.getByRole("button").focus()
    expect(screen.getByRole("button")).toHaveFocus()

    rerender(<Screen {...props} rejection={{ questionIds: ["nome"] }} />)

    expect(screen.getByLabelText("Nome")).toHaveFocus()
  })

  it("leaves focus alone when the refused question no longer has an error", () => {
    render(<Screen rejection={{ questionIds: ["nome"] }} errors={{}} />)

    expect(screen.getByLabelText("Nome")).not.toHaveFocus()
  })

  it("stays inside its own form when another one asks the same question", () => {
    render(
      <>
        <form>
          <div data-question-id="nome">
            <input aria-label="Nome noutro formulário" />
          </div>
        </form>

        <Screen
          rejection={{ questionIds: ["nome"] }}
          errors={{ nome: "Campo obrigatório" }}
        />
      </>,
    )

    expect(screen.getByLabelText("Nome")).toHaveFocus()
  })
})
