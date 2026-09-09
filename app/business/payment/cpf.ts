export function normalizeCpf(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "")
}

function checkDigit(digits: string, length: number): number {
  let sum = 0
  for (let index = 0; index < length; index++) {
    sum += Number(digits[index]) * (length + 1 - index)
  }
  const remainder = (sum * 10) % 11
  return remainder === 10 ? 0 : remainder
}

export function isValidCpf(value: string | null | undefined): boolean {
  const digits = normalizeCpf(value)
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  return (
    checkDigit(digits, 9) === Number(digits[9]) &&
    checkDigit(digits, 10) === Number(digits[10])
  )
}
