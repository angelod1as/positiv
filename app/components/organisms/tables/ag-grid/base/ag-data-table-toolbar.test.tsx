import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { AGDataTableToolbar } from "./ag-data-table-toolbar"
import type { GridApi } from "ag-grid-community"

describe("AGDataTableToolbar", () => {
  const mockGridApi = {
    setFilterModel: vi.fn(),
  } as unknown as GridApi

  const mockClearState = vi.fn()
  const mockOnClearFilters = vi.fn()
  const mockOnToggleFullscreen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Clear Filters Button", () => {
    it("should render clear filters button with correct text", () => {
      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      expect(
        screen.getByRole("button", { name: /limpar filtros/i }),
      ).toBeInTheDocument()
    })

    it("should call gridApi.setFilterModel(null) when clear filters is clicked", async () => {
      const user = userEvent.setup()

      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      await user.click(screen.getByRole("button", { name: /limpar filtros/i }))

      expect(mockGridApi.setFilterModel).toHaveBeenCalledWith(null)
    })

    it("should call onClearFilters callback when provided", async () => {
      const user = userEvent.setup()

      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          onClearFilters={mockOnClearFilters}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      await user.click(screen.getByRole("button", { name: /limpar filtros/i }))

      expect(mockOnClearFilters).toHaveBeenCalled()
    })

    it("should not crash when gridApi is null", async () => {
      const user = userEvent.setup()

      render(
        <AGDataTableToolbar
          gridApi={null}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      await user.click(screen.getByRole("button", { name: /limpar filtros/i }))

      // Should not throw
      expect(mockGridApi.setFilterModel).not.toHaveBeenCalled()
    })
  })

  describe("Reset Table Button", () => {
    it("should render reset table button with correct text", () => {
      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      expect(
        screen.getByRole("button", { name: /resetar tabela/i }),
      ).toBeInTheDocument()
    })

    it("should call clearState when reset table is clicked", async () => {
      const user = userEvent.setup()

      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      await user.click(screen.getByRole("button", { name: /resetar tabela/i }))

      expect(mockClearState).toHaveBeenCalled()
    })

    it("should call gridApi.setFilterModel(null) when reset table is clicked", async () => {
      const user = userEvent.setup()

      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      await user.click(screen.getByRole("button", { name: /resetar tabela/i }))

      expect(mockGridApi.setFilterModel).toHaveBeenCalledWith(null)
    })

    it("should call onClearFilters when reset table is clicked", async () => {
      const user = userEvent.setup()

      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          onClearFilters={mockOnClearFilters}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      await user.click(screen.getByRole("button", { name: /resetar tabela/i }))

      expect(mockOnClearFilters).toHaveBeenCalled()
    })
  })

  describe("Fullscreen Toggle Button", () => {
    it("should render maximize button when not fullscreen", () => {
      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      expect(
        screen.getByRole("button", { name: /tela cheia/i }),
      ).toBeInTheDocument()
    })

    it("should render minimize button when fullscreen", () => {
      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={true}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      expect(
        screen.getByRole("button", { name: /minimizar/i }),
      ).toBeInTheDocument()
    })

    it("should call onToggleFullscreen when fullscreen button is clicked", async () => {
      const user = userEvent.setup()

      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      await user.click(screen.getByRole("button", { name: /tela cheia/i }))

      expect(mockOnToggleFullscreen).toHaveBeenCalled()
    })
  })

  describe("Layout", () => {
    it("should render all three buttons", () => {
      render(
        <AGDataTableToolbar
          gridApi={mockGridApi}
          clearState={mockClearState}
          isFullscreen={false}
          onToggleFullscreen={mockOnToggleFullscreen}
        />,
      )

      const buttons = screen.getAllByRole("button")
      expect(buttons).toHaveLength(3)
    })
  })
})
