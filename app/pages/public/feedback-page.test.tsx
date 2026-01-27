import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it, vi } from "vitest"

vi.mock("~/lib/helpers/get-turnstile-config.server", () => ({
  getTurnstileConfig: vi.fn(() => ({
    siteKey: "test-site-key",
    secretKey: "test-secret-key",
  })),
}))

vi.mock("~/components/forms/base/schema-form", () => ({
  SchemaForm: ({
    children,
  }: {
    children: (props: {
      Field: React.FC<{ name: string }>
      Button: React.FC
      Errors: React.FC
      setValue: (name: string, value: string) => void
    }) => React.ReactNode
  }) => {
    const Field = ({ name }: { name: string }) => {
      if (name === "hasParticipated") {
        return (
          <select aria-label="Já participou de algum evento?">
            <option value="never">Nunca participei</option>
          </select>
        )
      }
      if (name === "feedbackText") {
        return <textarea aria-label="Seu feedback" />
      }
      const labels: Record<string, string> = {
        name: "Nome (opcional)",
        email: "E-mail (opcional)",
        whatsapp: "WhatsApp (opcional)",
        captchaToken: "Captcha",
      }
      return <input aria-label={labels[name] || name} />
    }
    const Button = () => <button type="submit">Enviar Feedback</button>
    const Errors = () => null
    const setValue = () => {}
    return <form data-testid="mock-schema-form">{children({ Field, Button, Errors, setValue })}</form>
  },
}))

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => <div data-testid="turnstile">Turnstile Mock</div>,
}))

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    useLoaderData: () => ({ turnstileSiteKey: "test-site-key" }),
  }
})

import FeedbackPage, { loader } from "./feedback-page"

const createTestRouter = () => {
  return createMemoryRouter(
    [
      {
        path: "/feedback",
        element: <FeedbackPage />,
      },
    ],
    {
      initialEntries: ["/feedback"],
    },
  )
}

describe("FeedbackPage", () => {
  describe("loader", () => {
    it("should return turnstile site key", async () => {
      const result = await loader()

      expect(result).toHaveProperty("turnstileSiteKey", "test-site-key")
    })
  })

  describe("component", () => {
    it("should render the feedback form", () => {
      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(screen.getByText(/envie seu feedback/i)).toBeInTheDocument()
      expect(screen.getByTestId("mock-schema-form")).toBeInTheDocument()
    })

    it("should render participation select", () => {
      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(
        screen.getByRole("combobox", { name: /participou/i }),
      ).toBeInTheDocument()
    })

    it("should render optional contact fields", () => {
      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(
        screen.getByRole("textbox", { name: /nome/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("textbox", { name: /e-mail/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("textbox", { name: /whatsapp/i }),
      ).toBeInTheDocument()
    })

    it("should render submit button", () => {
      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(
        screen.getByRole("button", { name: /enviar/i }),
      ).toBeInTheDocument()
    })

    it("should render turnstile widget", () => {
      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(screen.getByTestId("turnstile")).toBeInTheDocument()
    })
  })
})
