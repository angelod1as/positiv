import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

vi.mock("~/business/feedback/feedback.server", () => ({
  submitFeedback: vi.fn(),
}))

vi.mock("~/business/feedback/notify-new-feedback.server", () => ({
  notifyNewFeedback: vi.fn(),
}))

vi.mock("~/lib/helpers/verify-turnstile.server", () => ({
  verifyTurnstileToken: vi.fn(async () => ({ success: true })),
}))

vi.mock("remix-toast", () => ({
  redirectWithError: vi.fn((_path: string, message: string) => ({
    error: message,
  })),
  redirectWithSuccess: vi.fn((_path: string, message: string) => ({
    success: message,
  })),
}))

import { submitFeedback } from "~/business/feedback/feedback.server"
import { notifyNewFeedback } from "~/business/feedback/notify-new-feedback.server"
import FeedbackPage, { action, loader } from "./feedback-page"

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

// Each call uses its own IP so the rate limiter does not reject the next test
let ipCounter = 0

const submitAction = () => {
  ipCounter += 1
  const body = new URLSearchParams({
    hasParticipated: "once",
    feedbackText: "Feedback com pelo menos dez caracteres",
    captchaToken: "token",
    name: "João",
    email: "joao@example.com",
    whatsapp: "11999999999",
    canContact: "on",
  })

  return action({
    request: new Request("http://localhost/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "cf-connecting-ip": `10.0.0.${ipCounter}`,
      },
      body: body.toString(),
    }),
  } as Parameters<typeof action>[0])
}

describe("FeedbackPage", () => {
  describe("action", () => {
    beforeEach(() => {
      vi.mocked(submitFeedback).mockReset()
      vi.mocked(notifyNewFeedback).mockReset()
      vi.mocked(submitFeedback).mockResolvedValue({
        id: "feedback-1",
        name: "João",
        email: "joao@example.com",
        whatsapp: "11999999999",
        has_participated: "once",
        feedback_text: "Feedback com pelo menos dez caracteres",
        can_contact: true,
        ip_address: "unknown",
        created_at: "2024-01-15T10:30:00Z",
        status: "new",
      } as Awaited<ReturnType<typeof submitFeedback>>)
      vi.mocked(notifyNewFeedback).mockResolvedValue(undefined)
    })

    it("should notify the new feedback after storing it", async () => {
      await submitAction()

      expect(submitFeedback).toHaveBeenCalledTimes(1)
      expect(notifyNewFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "João",
          feedback_text: "Feedback com pelo menos dez caracteres",
        }),
      )
    })

    it("should still confirm the feedback when the notification fails", async () => {
      vi.mocked(notifyNewFeedback).mockRejectedValue(new Error("telegram down"))

      const result = await submitAction()

      expect(submitFeedback).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        success: expect.stringMatching(/obrigado pelo seu feedback/i),
      })
    })
  })

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

      expect(screen.getByRole("heading", { name: /envie seu feedback/i })).toBeInTheDocument()
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

    it("should display the information box about feedback acceptance", () => {
      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(
        screen.getByText(
          /A Positiv leva em consideração exclusivamente os feedbacks relacionados com a nossa organização e nosso evento/i,
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /Feedbacks de festas só serão aceitos via o formulário oficial enviado no grupo do WhatsApp do evento/i,
        ),
      ).toBeInTheDocument()
    })
  })
})
