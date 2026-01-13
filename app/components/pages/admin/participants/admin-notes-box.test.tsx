import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProfileFlagStatus } from "~types/database/entities.types"
import { AdminNotesBox } from "./admin-notes-box"

const mockFetcher = {
  submit: vi.fn(),
  state: "idle" as const,
  formData: undefined,
  data: undefined,
  formAction: undefined,
  formMethod: undefined,
  formEncType: undefined,
  text: undefined,
  json: undefined,
  key: "",
  Form: () => null,
  load: vi.fn(),
}

vi.mock("react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router")>()
  return {
    ...original,
    useFetcher: () => mockFetcher,
  }
})

describe("AdminNotesBox", () => {
  const defaultProps: {
    profileId: string
    flag: ProfileFlagStatus
    flagNotes: string | null
    generalNotes: string | null
    isVeteran: boolean
  } = {
    profileId: "test-profile-id",
    flag: "none",
    flagNotes: null,
    generalNotes: null,
    isVeteran: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createTestRouter = (props: typeof defaultProps) => {
    return createMemoryRouter([
      {
        path: "/",
        element: <AdminNotesBox {...props} />,
      },
    ])
  }

  it("should render the component with title", () => {
    const router = createTestRouter(defaultProps)
    render(<RouterProvider router={router} />)

    expect(screen.getByText("Em toda a Positiv")).toBeInTheDocument()
  })

  it("should render flag select with correct value", () => {
    const router = createTestRouter({ ...defaultProps, flag: "yellow" })
    render(<RouterProvider router={router} />)

    const flagSelect = screen.getByLabelText("Flag")
    expect(flagSelect).toBeInTheDocument()
  })

  it("should render flag notes textarea", () => {
    const router = createTestRouter({
      ...defaultProps,
      flagNotes: "Some warning",
    })
    render(<RouterProvider router={router} />)

    const textarea = screen.getByLabelText("Notas da Flag")
    expect(textarea).toHaveValue("Some warning")
  })

  it("should render general notes textarea", () => {
    const router = createTestRouter({
      ...defaultProps,
      generalNotes: "General admin notes",
    })
    render(<RouterProvider router={router} />)

    const textarea = screen.getByLabelText("Notas Gerais")
    expect(textarea).toHaveValue("General admin notes")
  })

  it("should render veteran checkbox with correct checked state", () => {
    const router = createTestRouter({ ...defaultProps, isVeteran: true })
    render(<RouterProvider router={router} />)

    const checkbox = screen.getByRole("checkbox", { name: /veterano/i })
    expect(checkbox).toBeChecked()
  })

  it("should submit form when flag changes", async () => {
    const user = userEvent.setup()

    const router = createTestRouter(defaultProps)
    render(<RouterProvider router={router} />)

    // Click the trigger to open the dropdown
    const flagSelect = screen.getByLabelText("Flag")
    await user.click(flagSelect)

    // Click the "Amarela" option (yellow flag)
    const yellowOption = await screen.findByRole("option", { name: /amarela/i })
    await user.click(yellowOption)

    await waitFor(() => {
      expect(mockFetcher.submit).toHaveBeenCalled()
    })

    const submitCall = mockFetcher.submit.mock.calls[0]
    expect(submitCall[0]).toBeInstanceOf(FormData)
    expect(submitCall[1]).toMatchObject({ method: "POST" })
  })

  it("should submit form when veteran checkbox changes", async () => {
    const user = userEvent.setup()

    const router = createTestRouter(defaultProps)
    render(<RouterProvider router={router} />)

    const checkbox = screen.getByRole("checkbox", { name: /veterano/i })
    await user.click(checkbox)

    await waitFor(() => {
      expect(mockFetcher.submit).toHaveBeenCalled()
    })

    const submitCall = mockFetcher.submit.mock.calls[0]
    expect(submitCall[0]).toBeInstanceOf(FormData)
  })

  it("should include profile_id and intent in submitted form data", async () => {
    const user = userEvent.setup()

    const router = createTestRouter(defaultProps)
    render(<RouterProvider router={router} />)

    const checkbox = screen.getByRole("checkbox", { name: /veterano/i })
    await user.click(checkbox)

    await waitFor(() => {
      expect(mockFetcher.submit).toHaveBeenCalled()
    })

    const formData = mockFetcher.submit.mock.calls[0][0] as FormData
    expect(formData.get("profile_id")).toBe("test-profile-id")
    expect(formData.get("intent")).toBe("update-profile-admin-notes")
  })

  describe("textarea submission behavior", () => {
    it("should NOT submit while typing in flag_notes textarea", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(defaultProps)
      render(<RouterProvider router={router} />)

      const textarea = screen.getByLabelText("Notas da Flag")
      await user.type(textarea, "typing some notes")

      // Should NOT have submitted while typing
      expect(mockFetcher.submit).not.toHaveBeenCalled()
    })

    it("should submit flag_notes on blur when value changed", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(defaultProps)
      render(<RouterProvider router={router} />)

      const textarea = screen.getByLabelText("Notas da Flag")
      await user.type(textarea, "new notes")
      await user.tab() // Move focus away (blur)

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalledTimes(1)
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("flag_notes")).toBe("new notes")
    })

    it("should NOT submit flag_notes on blur when value unchanged", async () => {
      const user = userEvent.setup()

      const router = createTestRouter({
        ...defaultProps,
        flagNotes: "existing notes",
      })
      render(<RouterProvider router={router} />)

      const textarea = screen.getByLabelText("Notas da Flag")
      // Just focus and blur without changing
      await user.click(textarea)
      await user.tab()

      expect(mockFetcher.submit).not.toHaveBeenCalled()
    })

    it("should NOT submit general_notes while typing", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(defaultProps)
      render(<RouterProvider router={router} />)

      const textarea = screen.getByLabelText("Notas Gerais")
      await user.type(textarea, "typing general notes")

      expect(mockFetcher.submit).not.toHaveBeenCalled()
    })

    it("should submit general_notes on blur when value changed", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(defaultProps)
      render(<RouterProvider router={router} />)

      const textarea = screen.getByLabelText("Notas Gerais")
      await user.type(textarea, "new general notes")
      await user.tab()

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalledTimes(1)
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("general_notes")).toBe("new general notes")
    })
  })
})
