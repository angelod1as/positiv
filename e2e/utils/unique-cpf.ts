import { randomInt } from "node:crypto"

// Modulo 11, as Receita Federal defines it.
function checkDigit(digits: string): number {
  const length = digits.length
  let sum = 0
  for (let index = 0; index < length; index++) {
    sum += Number(digits[index]) * (length + 1 - index)
  }
  const remainder = (sum * 10) % 11
  return remainder === 10 ? 0 : remainder
}

const handedOut = new Set<string>()

/**
 * A CPF the app accepts, and one no other account in the run holds: one
 * profile per CPF is enforced, and the profile update guard blocks every page
 * for an account whose CPF does not check out. Random base digits keep
 * separate Playwright processes apart; the set keeps one process from repeating
 * itself.
 */
export function uniqueValidCpf(): string {
  for (;;) {
    const base = String(randomInt(0, 1_000_000_000)).padStart(9, "0")
    // All nine digits the same is refused by isValidCpf, check digits or not.
    if (/^(\d)\1{8}$/.test(base)) continue
    const first = checkDigit(base)
    const cpf = `${base}${first}${checkDigit(`${base}${first}`)}`
    if (handedOut.has(cpf)) continue
    handedOut.add(cpf)
    return cpf
  }
}
