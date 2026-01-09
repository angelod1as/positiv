import userEvent from "@testing-library/user-event"
import type { FetcherWithComponents } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import type { ComposableFetcherData } from "~types/database/entities.types"
import { ListmonkFilterModal } from "./listmonk-filter-modal"

function createMockFetcher(
  state: "idle" | "submitting" | "loading" = "idle",
  intent?: string,
) {
  const formData = intent ? new FormData() : undefined
  if (formData && intent) {
    formData.set("intent", intent)
  }
  return {
    Form: ({ children, ...props }: { children: React.ReactNode }) => (
      <form {...props}>{children}</form>
    ),
    state,
    data: undefined,
    formData,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    submit: vi.fn(),
    load: vi.fn(),
  } as unknown as FetcherWithComponents<ComposableFetcherData>
}

describe("ListmonkFilterModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    fetcher: createMockFetcher(),
    hasExistingList: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("should render modal with three filter sections", () => {
      render(<ListmonkFilterModal {...defaultProps} />)

      expect(screen.getByText(/Status de Aprovação/i)).toBeInTheDocument()
      expect(screen.getByText(/Status de Processo/i)).toBeInTheDocument()
      expect(screen.getByText(/Status de Presença/i)).toBeInTheDocument()
    })

    it("should render approval status checkboxes with default selections", () => {
      render(<ListmonkFilterModal {...defaultProps} />)

      const pendingCheckbox = screen.getByRole("checkbox", {
        name: /Status de Aprovação: Pendente/i,
      })
      const approvedCheckbox = screen.getByRole("checkbox", {
        name: /Status de Aprovação: Aprovade$/i,
      })
      const approvedWithReservationsCheckbox = screen.getByRole("checkbox", {
        name: /Status de Aprovação: Aprovade com Ressalvas/i,
      })
      const rejectedCheckbox = screen.getByRole("checkbox", {
        name: /Status de Aprovação: Rejeitade/i,
      })

      expect(pendingCheckbox).toBeChecked()
      expect(approvedCheckbox).toBeChecked()
      expect(approvedWithReservationsCheckbox).toBeChecked()
      expect(rejectedCheckbox).not.toBeChecked()
    })

    it("should render all application status checkboxes checked by default", () => {
      render(<ListmonkFilterModal {...defaultProps} />)

      expect(
        screen.getByRole("checkbox", { name: /Status de Processo: Pendente/i }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", {
          name: /Status de Processo: Conversando/i,
        }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", {
          name: /Status de Processo: Dados de pagto enviados/i,
        }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", {
          name: /Status de Processo: Regras enviadas/i,
        }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", {
          name: /Status de Processo: Pensar melhor/i,
        }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", {
          name: /Status de Processo: Finalizado/i,
        }),
      ).toBeChecked()
    })

    it("should render all attendance status checkboxes checked by default", () => {
      render(<ListmonkFilterModal {...defaultProps} />)

      expect(
        screen.getByRole("checkbox", { name: /Status de Presença: Pendente/i }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", {
          name: /Status de Presença: Compareceu/i,
        }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", {
          name: /Status de Presença: Não compareceu/i,
        }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", {
          name: /Status de Presença: Pulade \(rodízio\)/i,
        }),
      ).toBeChecked()
      expect(
        screen.getByRole("checkbox", { name: /Status de Presença: Não vai/i }),
      ).toBeChecked()
    })

    it("should not render modal when isOpen is false", () => {
      render(<ListmonkFilterModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText(/Status de Aprovação/i)).not.toBeInTheDocument()
    })
  })

  describe("checkbox interactions", () => {
    it("should toggle approval status checkbox when clicked", async () => {
      const user = userEvent.setup()
      render(<ListmonkFilterModal {...defaultProps} />)

      const rejectedCheckbox = screen.getByRole("checkbox", {
        name: /Status de Aprovação: Rejeitade/i,
      })
      expect(rejectedCheckbox).not.toBeChecked()

      await user.click(rejectedCheckbox)
      expect(rejectedCheckbox).toBeChecked()

      await user.click(rejectedCheckbox)
      expect(rejectedCheckbox).not.toBeChecked()
    })

    it("should toggle application status checkbox when clicked", async () => {
      const user = userEvent.setup()
      render(<ListmonkFilterModal {...defaultProps} />)

      const finalizadoCheckbox = screen.getByRole("checkbox", {
        name: /Status de Processo: Finalizado/i,
      })
      expect(finalizadoCheckbox).toBeChecked()

      await user.click(finalizadoCheckbox)
      expect(finalizadoCheckbox).not.toBeChecked()
    })

    it("should toggle attendance status checkbox when clicked", async () => {
      const user = userEvent.setup()
      render(<ListmonkFilterModal {...defaultProps} />)

      const attendedCheckbox = screen.getByRole("checkbox", {
        name: /Status de Presença: Compareceu/i,
      })
      expect(attendedCheckbox).toBeChecked()

      await user.click(attendedCheckbox)
      expect(attendedCheckbox).not.toBeChecked()
    })
  })

  describe("submit and cancel", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<ListmonkFilterModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole("button", { name: /cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("should submit form with selected filters when submit button is clicked", async () => {
      const user = userEvent.setup()
      const fetcher = createMockFetcher()
      const submit = vi.fn()
      fetcher.submit = submit

      render(<ListmonkFilterModal {...defaultProps} fetcher={fetcher} />)

      const submitButton = screen.getByRole("button", {
        name: /sincronizar/i,
      })
      await user.click(submitButton)

      expect(submit).toHaveBeenCalledTimes(1)

      const formData = submit.mock.calls[0][0]
      expect(formData).toBeInstanceOf(FormData)
      expect(formData.get("intent")).toBe("sync-listmonk-list")

      const approvalStatuses = formData.getAll("approvalStatuses")
      expect(approvalStatuses).toContain("pending")
      expect(approvalStatuses).toContain("approved")
      expect(approvalStatuses).toContain("approved_with_reservations")
      expect(approvalStatuses).not.toContain("rejected")
    })

    it("should close modal after successful submission", () => {
      const onClose = vi.fn()
      const fetcher = createMockFetcher()
      fetcher.state = "idle"
      fetcher.data = { success: true, intent: "sync-listmonk-list" }

      render(
        <ListmonkFilterModal
          {...defaultProps}
          onClose={onClose}
          fetcher={fetcher}
        />,
      )

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("should not close modal with stale data from different intent", () => {
      const onClose = vi.fn()
      const fetcher = createMockFetcher()
      fetcher.state = "idle"
      fetcher.data = { success: true, intent: "update-event-participant" }

      render(
        <ListmonkFilterModal
          {...defaultProps}
          onClose={onClose}
          fetcher={fetcher}
        />,
      )

      expect(onClose).not.toHaveBeenCalled()
    })

    it("should not close modal when submission fails", () => {
      const onClose = vi.fn()
      const fetcher = createMockFetcher()
      fetcher.state = "idle"
      fetcher.data = { success: false, intent: "sync-listmonk-list" }

      render(
        <ListmonkFilterModal
          {...defaultProps}
          onClose={onClose}
          fetcher={fetcher}
        />,
      )

      expect(onClose).not.toHaveBeenCalled()
    })

    it("should not close modal when fetcher is still submitting", () => {
      const onClose = vi.fn()
      const fetcher = createMockFetcher("submitting", "sync-listmonk-list")

      render(
        <ListmonkFilterModal
          {...defaultProps}
          onClose={onClose}
          fetcher={fetcher}
        />,
      )

      expect(onClose).not.toHaveBeenCalled()
    })

    it("should submit all checked filters in FormData", async () => {
      const user = userEvent.setup()
      const fetcher = createMockFetcher()
      const submit = vi.fn()
      fetcher.submit = submit

      render(<ListmonkFilterModal {...defaultProps} fetcher={fetcher} />)

      const rejectedCheckbox = screen.getByRole("checkbox", {
        name: /Status de Aprovação: Rejeitade/i,
      })
      await user.click(rejectedCheckbox)

      const finalizadoCheckbox = screen.getByRole("checkbox", {
        name: /Status de Processo: Finalizado/i,
      })
      await user.click(finalizadoCheckbox)

      const submitButton = screen.getByRole("button", {
        name: /sincronizar/i,
      })
      await user.click(submitButton)

      const formData = submit.mock.calls[0][0]

      const approvalStatuses = formData.getAll("approvalStatuses")
      expect(approvalStatuses).toContain("rejected")

      const applicationStatuses = formData.getAll("applicationStatuses")
      expect(applicationStatuses).not.toContain("finalised")
    })
  })

  describe("loading state", () => {
    it("should disable submit button when fetcher is submitting", () => {
      const fetcher = createMockFetcher("submitting")
      render(<ListmonkFilterModal {...defaultProps} fetcher={fetcher} />)

      const submitButton = screen.getByRole("button", {
        name: /sincronizando/i,
      })
      expect(submitButton).toBeDisabled()
    })

    it("should show loading text when fetcher is submitting", () => {
      const fetcher = createMockFetcher("submitting")
      render(<ListmonkFilterModal {...defaultProps} fetcher={fetcher} />)

      expect(
        screen.getByRole("button", { name: /sincronizando/i }),
      ).toBeInTheDocument()
    })
  })
})
