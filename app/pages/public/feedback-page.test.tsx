import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()

vi.mock("~/lib/helpers/get-turnstile-config.server", () => ({
  getTurnstileConfig: vi.fn(() => ({
    siteKey: "test-site-key",
    secretKey: "test-secret-key",
  })),
}))

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" onClick={() => onSuccess("token-de-teste")}>
      Resolver captcha
    </button>
  ),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useLoaderData: () => ({ turnstileSiteKey: "test-site-key" }),
    useNavigate: () => navigate,
  }
})

import { toast } from "sonner"
import FeedbackPage, { loader } from "./feedback-page"

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/feedback"]}>
      <FeedbackPage />
    </MemoryRouter>,
  )

const fill = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.selectOptions(
    screen.getByLabelText("Já participou de algum evento?"),
    "once",
  )
  await user.type(
    screen.getByLabelText("Seu feedback"),
    "Um feedback de tamanho decente",
  )
  await user.click(screen.getByRole("button", { name: "Resolver captcha" }))
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Enviar Feedback" }))

const answers = (result: unknown, init?: ResponseInit) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(result, init) as Response)

describe("FeedbackPage", () => {
  beforeEach(() => {
    navigate.mockClear()
    vi.mocked(toast.success).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("loader", () => {
    it("should return turnstile site key", async () => {
      const result = await loader()

      expect(result).toEqual({ turnstileSiteKey: "test-site-key" })
    })
  })

  describe("component", () => {
    it("asks everything on one screen", () => {
      renderPage()

      expect(screen.getByLabelText("Nome (opcional)")).toBeVisible()
      expect(screen.getByLabelText("E-mail (opcional)")).toBeVisible()
      expect(screen.getByLabelText("WhatsApp (opcional)")).toBeVisible()
      expect(
        screen.getByLabelText("Já participou de algum evento?"),
      ).toBeVisible()
      expect(screen.getByLabelText("Seu feedback")).toBeVisible()
      expect(
        screen.getByRole("checkbox", { name: /Podemos entrar em contato/ }),
      ).toBeVisible()
    })

    it("displays the information box about feedback acceptance", () => {
      renderPage()

      expect(screen.getByText(/formulário oficial/)).toBeVisible()
    })

    it("draws the security check", () => {
      renderPage()

      expect(
        screen.getByRole("button", { name: "Resolver captcha" }),
      ).toBeVisible()
    })

    it("refuses to send anything until the captcha has answered", async () => {
      const user = userEvent.setup()
      const fetch = answers({ ok: true })
      renderPage()

      await user.selectOptions(
        screen.getByLabelText("Já participou de algum evento?"),
        "once",
      )
      await user.type(
        screen.getByLabelText("Seu feedback"),
        "Um feedback de tamanho decente",
      )
      await submit(user)

      // The wording is the captcha's own, not the shared "required" copy: what
      // is missing is a security check nobody can type into.
      expect(
        await screen.findByText("Por favor, complete a verificação de segurança"),
      ).toBeVisible()
      expect(fetch).not.toHaveBeenCalled()
    })

    it("sends the answers to the feedback route", async () => {
      const user = userEvent.setup()
      const fetch = answers({ ok: true })
      renderPage()

      await fill(user)
      await submit(user)

      await waitFor(() => expect(fetch).toHaveBeenCalled())
      const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/feedback")
      expect(JSON.parse(String(init.body))).toMatchObject({
        hasParticipated: "once",
        feedbackText: "Um feedback de tamanho decente",
        captchaToken: "token-de-teste",
      })
    })

    it("thanks the person and takes them home", async () => {
      const user = userEvent.setup()
      answers({ ok: true })
      renderPage()

      await fill(user)
      await submit(user)

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"))
      expect(toast.success).toHaveBeenCalled()
    })

    it("says a feedback sent too soon was refused, and stays put", async () => {
      const user = userEvent.setup()
      answers(
        {
          ok: false,
          errors: [],
          message:
            "Você já enviou um feedback recentemente. Por favor, aguarde antes de enviar outro.",
        },
        { status: 422 },
      )
      renderPage()

      await fill(user)
      await submit(user)

      expect(
        await screen.findByText(/já enviou um feedback recentemente/),
      ).toBeVisible()
      expect(navigate).not.toHaveBeenCalled()
    })

    it("blames the captcha when the security check refused it", async () => {
      const user = userEvent.setup()
      answers(
        {
          ok: false,
          errors: [
            {
              questionId: "captchaToken",
              message: "Verificação de segurança falhou",
            },
          ],
        },
        { status: 422 },
      )
      renderPage()

      await fill(user)
      await submit(user)

      expect(
        await screen.findByText("Verificação de segurança falhou"),
      ).toBeVisible()
      expect(navigate).not.toHaveBeenCalled()
    })
  })
})
