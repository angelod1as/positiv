import { describe, expect, it, vi } from "vitest"

vi.mock("varlock/env", () => ({ ENV: {} }))

import { paymentsCopy } from "~/copy/payments"
import { AsaasError } from "./asaas-client.server"
import { asaasErrorMessage } from "./asaas-error-message"

const refused = (code: string, description: string, status = 400) =>
  new AsaasError(status, [{ code, description }], "/installments/inst_1/refund")

const { asaasErrors } = paymentsCopy

describe("asaasErrorMessage", () => {
  it("explains that a card is refunded in part only from the next day", () => {
    const error = refused(
      "invalid_action",
      "Esta transação só pode ser estornada parcialmente no próximo dia.",
    )

    expect(asaasErrorMessage(error, "refund")).toBe(asaasErrors.refundNextDay)
  })

  it("explains a refund Asaas has no balance for", () => {
    const error = refused("invalid_action", "Saldo insuficiente para realizar o estorno.")

    expect(asaasErrorMessage(error, "refund")).toBe(asaasErrors.refundNoBalance)
  })

  it("explains a refund larger than what is left to give back", () => {
    const error = refused(
      "invalid_value",
      "O valor do estorno excede o valor disponível.",
    )

    expect(asaasErrorMessage(error, "refund")).toBe(asaasErrors.refundTooMuch)
  })

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
