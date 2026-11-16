import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { sections } from "../../test/sections"
import { validateValueOf } from "../../test/validate"
import { systemComponent as systemComponentType } from "./system-component"

const { systemComponent } = sections

describe("systemComponent", () => {
  it("accepts a component picked from the list", async () => {
    expect(await validateValueOf("systemComponent", systemComponent)).toEqual(
      [],
    )
  })

  it("requires a component", async () => {
    const errors = await validateValueOf("systemComponent", {
      ...systemComponent,
      component: undefined,
    })

    expect(pathsOf(errors)).toContain("systemComponent.component")
  })

  it("rejects a component the Platform does not have", async () => {
    const errors = await validateValueOf("systemComponent", {
      ...systemComponent,
      component: "somethingElse",
    })

    expect(pathsOf(errors)).toContain("systemComponent.component")
  })

  it("offers the analytics opt-out button", () => {
    const field = systemComponentType.fields.find(
      (candidate) => candidate.name === "component",
    ) as { options?: { list?: { title: string; value: string }[] } }

    expect(field.options?.list).toEqual([
      { title: "Botão: não registrar minhas visitas", value: "analyticsOptOut" },
    ])
  })

  it("names the preview after the chosen component", () => {
    expect(
      systemComponentType.preview?.prepare?.({ component: "analyticsOptOut" }),
    ).toEqual(
      expect.objectContaining({
        title: "Componente do sistema",
        subtitle: "Botão: não registrar minhas visitas",
      }),
    )
  })
})
