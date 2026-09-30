import { describe, expect, it, vi } from "vitest"

vi.mock("varlock/env", () => ({ ENV: {} }))

import { paymentsCopy } from "~/copy/payments"
import { AsaasError } from "./asaas-client.server"
import { asaasErrorMessage } from "./asaas-error-message"

const refused = (code: string, description: string, status = 400) =>
  new AsaasError(status, [{ code, description }], "/installments/inst_1/refund")

const { asaasErrors } = paymentsCopy

describe("asaasErrorMessage", () => {
  it("explains a CPF Asaas refuses at checkout", () => {
    const error = refused("invalid_cpfCnpj", "O CPF/CNPJ informado é inválido.")

    expect(asaasErrorMessage(error, "checkout")).toBe(asaasErrors.checkoutCpf)
  })

  it("says what Asaas said, without the status or the path, for anything else", () => {
    const error = refused("invalid_billingType", "Forma de pagamento inválida.")

    const message = asaasErrorMessage(error, "checkout")

    expect(message).toBe(asaasErrors.checkoutRefused("Forma de pagamento inválida."))
    expect(message).not.toMatch(/400|\/installments|invalid_billingType/)
  })

  it("says what Asaas said when it refuses to be read", () => {
    const error = refused("invalid_action", "Cobrança não encontrada.")

    expect(asaasErrorMessage(error, "sync")).toBe(
      asaasErrors.syncRefused("Cobrança não encontrada."),
    )
  })

  it("does not blame the person when Asaas fails on its side", () => {
    const error = new AsaasError(503, [], "/payments")

    expect(asaasErrorMessage(error, "checkout")).toBe(asaasErrors.unavailable)
  })

  it.each([
    ["the connection drops", new TypeError("fetch failed")],
    ["Asaas does not answer in time", new DOMException("aborted", "AbortError")],
  ])("says Asaas did not answer when %s", (_, error) => {
    expect(asaasErrorMessage(error, "checkout")).toBe(asaasErrors.unavailable)
  })

  it("leaves the app's own sentences alone", () => {
    const error = new Error(paymentsCopy.errors.chargeClosed)

    expect(asaasErrorMessage(error, "checkout")).toBe(paymentsCopy.errors.chargeClosed)
  })
})
