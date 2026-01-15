import type { RenderOptions, RenderHookOptions } from "@testing-library/react"
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  screen,
  waitFor,
  within,
  fireEvent,
  act,
} from "@testing-library/react"
import type { ReactElement } from "react"
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router"
import { TestWrapper } from "./test-wrapper"

export function render(ui: ReactElement, options?: RenderOptions) {
  const { wrapper: UserWrapper, ...restOptions } = options || {}

  const CombinedWrapper = UserWrapper
    ? ({ children }: { children: React.ReactNode }) => (
        <TestWrapper>
          <UserWrapper>{children}</UserWrapper>
        </TestWrapper>
      )
    : TestWrapper

  return rtlRender(ui, { wrapper: CombinedWrapper, ...restOptions })
}

export function renderHook<Result, Props>(
  hook: (props: Props) => Result,
  options?: RenderHookOptions<Props>,
) {
  const { wrapper: UserWrapper, ...restOptions } = options || {}

  const CombinedWrapper = UserWrapper
    ? ({ children }: { children: React.ReactNode }) => (
        <TestWrapper>
          <UserWrapper>{children}</UserWrapper>
        </TestWrapper>
      )
    : TestWrapper

  return rtlRenderHook(hook, {
    wrapper: CombinedWrapper,
    ...restOptions,
  } as RenderHookOptions<Props>)
}

/**
 * Render with MemoryRouter for components that use React Router Link.
 * Use this instead of render() when testing components with routing.
 */
export function renderWithRouter(ui: ReactElement, options?: RenderOptions) {
  const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  )
  return render(ui, { wrapper: RouterWrapper, ...options })
}

/**
 * Render with a data router for components that use useFetcher, useLoaderData, etc.
 * Use this when testing components that need full data router capabilities.
 */
export function renderWithDataRouter(ui: ReactElement, options?: RenderOptions) {
  const router = createMemoryRouter([{ path: "/", element: ui }])
  return render(<RouterProvider router={router} />, options)
}

export { screen, waitFor, within, fireEvent, act }
