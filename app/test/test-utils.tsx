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

export { screen, waitFor, within, fireEvent, act }
