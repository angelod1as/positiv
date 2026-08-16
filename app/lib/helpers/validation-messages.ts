export const validationMessages = {
  required: "Campo obrigatório",
  invalid: "Valor inválido",
  invalidEmail: "E-mail inválido",
  invalidDate: "Data inválida",
  invalidFormat: "Formato inválido",
  minLength: (length: number) =>
    length === 1 ? "No mínimo 1 caractere" : `No mínimo ${length} caracteres`,
  maxLength: (length: number) =>
    length === 1 ? "No máximo 1 caractere" : `No máximo ${length} caracteres`,
  minOptions: (count: number) =>
    count === 1
      ? "Selecione ao menos uma opção"
      : `Selecione ao menos ${count} opções`,
  maxOptions: (count: number) =>
    count === 1
      ? "Selecione no máximo uma opção"
      : `Selecione no máximo ${count} opções`,
  minValue: (value: number) => `O valor mínimo é ${value}`,
  maxValue: (value: number) => `O valor máximo é ${value}`,
}
