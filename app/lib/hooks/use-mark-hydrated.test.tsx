import { renderHook } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"
import { useMarkHydrated } from "./use-mark-hydrated"

const Marker = () => {
  useMarkHydrated()
  return null
}

describe("useMarkHydrated", () => {
  afterEach(() => {
    delete document.documentElement.dataset.hydrated
  })

  it("leaves the document unmarked while it is only server-rendered", () => {
    renderToString(<Marker />)

    expect(document.documentElement).not.toHaveAttribute("data-hydrated")
  })

  it("marks the document once React has taken it over", () => {
    renderHook(() => useMarkHydrated())

    expect(document.documentElement).toHaveAttribute("data-hydrated", "true")
  })
})
