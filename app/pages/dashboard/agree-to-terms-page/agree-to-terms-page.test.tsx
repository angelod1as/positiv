import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Route } from "./+types/agree-to-terms-page"
import AgreeToTermsPage from "./agree-to-terms-page"

vi.mock("~/components/forms/base/schema-form", () => ({
  SchemaForm: ({
    children,
  }: {
    children: (props: {
      Field: React.FC<{ name: string }>
      Button: React.FC
      Errors: React.FC
    }) => React.ReactNode
  }) => {
    const Field = () => null
    const Button = () => <button type="submit">Continuar</button>
    const Errors = () => null
    return <form>{children({ Field, Button, Errors })}</form>
  },
}))

const EXPECTED_HEADINGS = [
  "O que é a Positiv?",
  "Próximos passos",
  "Entradas sociais",
  "Política de reembolso",
]

const createProps = (): Route.ComponentProps =>
  ({
    loaderData: { mktEmails: undefined },
    params: {},
    matches: [] as unknown as Route.ComponentProps["matches"],
  }) as Route.ComponentProps

describe("AgreeToTermsPage", () => {
  it("renders no accidental code blocks", () => {
    const { container } = render(<AgreeToTermsPage {...createProps()} />)

    expect(container.querySelector("pre")).toBeNull()
    expect(container.querySelector("code")).toBeNull()
  })

  it("renders section headings in copy order", () => {
    render(<AgreeToTermsPage {...createProps()} />)

    const renderedHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)

    expect(renderedHeadings).toEqual(EXPECTED_HEADINGS)
  })

  it("renders the refund list structure", () => {
    const { container } = render(<AgreeToTermsPage {...createProps()} />)

    expect(container.querySelectorAll("ul")).toHaveLength(3)
    expect(container.querySelectorAll("li")).toHaveLength(8)
  })
})
