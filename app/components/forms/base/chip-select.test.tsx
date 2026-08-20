import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { ChipSelect } from "./chip-select"

const options = [
  { label: "Homem cis", value: "Homem cis" },
  { label: "Mulher cis", value: "Mulher cis" },
  { label: "Travesti", value: "Travesti" },
]

type HarnessProps = {
  initial?: string[]
  allowOther?: boolean
  otherPlaceholder?: string
  onChange?: (value: string[]) => void
}

const Harness = ({
  initial = [],
  allowOther = true,
  otherPlaceholder,
  onChange,
}: HarnessProps) => {
  const [value, setValue] = useState<string[]>(initial)

  return (
    <>
      <span id="prompt">Gênero</span>
      <ChipSelect
        options={options}
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange?.(next)
        }}
        allowOther={allowOther}
        otherPlaceholder={otherPlaceholder}
        labelledBy="prompt"
      />
    </>
  )
}

const field = () => screen.getByRole("textbox")

describe("ChipSelect", () => {
  describe("choosing from the options", () => {
    it("draws one pill per option", () => {
      render(<Harness />)

      expect(screen.getByRole("button", { name: "Homem cis" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Mulher cis" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Travesti" })).toBeInTheDocument()
    })

    it("reports an option that was picked", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      await user.click(screen.getByRole("button", { name: "Travesti" }))

      expect(onChange).toHaveBeenCalledWith(["Travesti"])
    })

    it("drops an option that was picked twice", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness initial={["Travesti"]} onChange={onChange} />)

      await user.click(screen.getByRole("button", { name: "Travesti" }))

      expect(onChange).toHaveBeenCalledWith([])
    })

    it("says which options are on", () => {
      render(<Harness initial={["Mulher cis"]} />)

      expect(screen.getByRole("button", { name: "Mulher cis" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      expect(screen.getByRole("button", { name: "Travesti" })).toHaveAttribute(
        "aria-pressed",
        "false",
      )
    })
  })

  describe("answering with something that is not on the list", () => {
    it("turns what was typed into a chip on Enter", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      await user.type(field(), "Bigênere{Enter}")

      expect(onChange).toHaveBeenCalledWith(["Bigênere"])
      expect(field()).toHaveValue("")
    })

    it("does not submit the form around it on Enter", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
      render(
        <form onSubmit={onSubmit}>
          <Harness />
          <button type="submit">Continuar</button>
        </form>,
      )

      await user.type(field(), "Bigênere{Enter}")

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("takes a comma as the end of a value", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      await user.type(field(), "Bigênere,")

      expect(onChange).toHaveBeenCalledWith(["Bigênere"])
    })

    it("takes a semicolon as the end of a value", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      await user.type(field(), "Bigênere;")

      expect(onChange).toHaveBeenCalledWith(["Bigênere"])
    })

    it("keeps what was typed when the field loses focus", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      await user.type(field(), "Bigênere")
      await user.tab()

      expect(onChange).toHaveBeenCalledWith(["Bigênere"])
    })

    it("adds through the button, which waits for something to add", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      const add = screen.getByRole("button", { name: "Adicionar" })
      expect(add).toBeDisabled()

      await user.type(field(), "Bigênere")
      expect(add).toBeEnabled()

      await user.click(add)
      expect(onChange).toHaveBeenCalledWith(["Bigênere"])
    })

    it("splits a pasted list on its separators", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      await user.click(field())
      await user.paste("Bigênere, Neutrois")
      await user.tab()

      expect(onChange).toHaveBeenCalledWith(["Bigênere", "Neutrois"])
    })

    it("ignores blank space", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      await user.type(field(), "   {Enter}")

      expect(onChange).not.toHaveBeenCalled()
    })

    it("ignores a value it already holds, whatever the casing", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness initial={["Bigênere"]} onChange={onChange} />)

      await user.type(field(), "bigênere{Enter}")

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getAllByText("Bigênere")).toHaveLength(1)
    })

    it("ignores a value that is already one of the options", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      await user.type(field(), "Travesti{Enter}")

      expect(onChange).not.toHaveBeenCalled()
    })

    it("draws a value that arrived from outside as a chip", () => {
      render(<Harness initial={["Mulher cis", "Bigênere"]} />)

      expect(
        screen.getByRole("button", { name: "Remover Bigênere" }),
      ).toBeInTheDocument()
    })

    it("removes a chip through its own button", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness initial={["Bigênere"]} onChange={onChange} />)

      await user.click(screen.getByRole("button", { name: "Remover Bigênere" }))

      expect(onChange).toHaveBeenCalledWith([])
    })

    it("removes the last chip on backspace in an empty field", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness initial={["Bigênere", "Neutrois"]} onChange={onChange} />)

      await user.click(field())
      await user.keyboard("{Backspace}")

      expect(onChange).toHaveBeenCalledWith(["Bigênere"])
    })

    it("leaves the chips alone on backspace while there is text to erase", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness initial={["Bigênere"]} onChange={onChange} />)

      await user.type(field(), "a{Backspace}")

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe("configuration", () => {
    it("offers no free-text field without allowOther", () => {
      render(<Harness allowOther={false} />)

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: "Adicionar" }),
      ).not.toBeInTheDocument()
    })

    it("invites the answer in its own words when asked to", () => {
      render(<Harness otherPlaceholder="Não se vê aqui?" />)

      expect(field()).toHaveAttribute("placeholder", "Não se vê aqui?")
    })
  })

  describe("accessibility", () => {
    it("names the group after the prompt", () => {
      render(<Harness />)

      expect(screen.getByRole("group", { name: "Gênero" })).toBeInTheDocument()
    })

    it("announces what came and what went", async () => {
      const user = userEvent.setup()
      render(<Harness initial={["Bigênere"]} />)

      await user.type(field(), "Neutrois{Enter}")
      expect(screen.getByRole("status")).toHaveTextContent("Neutrois adicionado")

      await user.click(screen.getByRole("button", { name: "Remover Bigênere" }))
      expect(screen.getByRole("status")).toHaveTextContent("Bigênere removido")
    })
  })
})
