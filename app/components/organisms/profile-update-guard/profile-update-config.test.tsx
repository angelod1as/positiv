import { describe, expect, it } from "vitest"
import { isValidElement } from "react"
import { PROFILE_REQUIREMENTS, isExemptPath } from "./profile-update-config"

describe("PROFILE_REQUIREMENTS", () => {
  it("should have race_color in requiredFields array", () => {
    expect(PROFILE_REQUIREMENTS.requiredFields).toContain("race_color")
  })

  it("should have targetPath set to /conta/dados-basicos", () => {
    expect(PROFILE_REQUIREMENTS.targetPath).toBe("/conta/dados-basicos")
  })

  it("should have message as a valid React element", () => {
    expect(isValidElement(PROFILE_REQUIREMENTS.message)).toBe(true)
  })

  it("should have all required exempt paths", () => {
    const requiredExemptPaths = [
      "/",
      "/entrar",
      "/entrar/esqueci",
      "/registrar",
      "/registrar/callback",
      "/registrar/confirm",
      "/conta",
      "/conta/mudar-senha",
      "/conta/termos-e-condicoes",
      "/conta/dados-basicos",
      "/conta/dados-basicos-cont",
    ]

    requiredExemptPaths.forEach((path) => {
      expect(PROFILE_REQUIREMENTS.exemptPaths).toContain(path)
    })
  })
})

describe("isExemptPath", () => {
  it("should return true for login path", () => {
    expect(isExemptPath("/entrar")).toBe(true)
  })

  it("should return true for basic-data path", () => {
    expect(isExemptPath("/conta/dados-basicos")).toBe(true)
  })

  it("should return true for terms path", () => {
    expect(isExemptPath("/conta/termos-e-condicoes")).toBe(true)
  })

  it("should return false for dashboard path", () => {
    expect(isExemptPath("/dashboard")).toBe(false)
  })

  it("should return false for events path", () => {
    expect(isExemptPath("/events")).toBe(false)
  })
})