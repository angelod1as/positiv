type CsvValue = string | number | null | undefined

const BOM = "\uFEFF"
const SEPARATOR = ";"
const LINE_BREAK = "\r\n"

const escapeField = (value: CsvValue) => {
  const field = String(value ?? "")
  return /[;"\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field
}

const toLine = (fields: CsvValue[]) =>
  fields.map(escapeField).join(SEPARATOR) + LINE_BREAK

// Semicolons because Excel in Brazilian Portuguese splits on them, and the BOM
// is what makes Excel read the accents as UTF-8
export const buildCsv = (rows: Array<Record<string, CsvValue>>) => {
  if (rows.length === 0) return BOM

  const headers = Object.keys(rows[0])
  return (
    BOM +
    toLine(headers) +
    rows.map((row) => toLine(headers.map((header) => row[header]))).join("")
  )
}

export const downloadCSV = (content: string, filename = "planilha") => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })

  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
