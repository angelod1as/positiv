import * as XLSX from "xlsx"

type DownloadXLSX = <T>(
  data: Array<T>,
  filename?: string,
  sheetName?: string,
) => void
export const downloadXLSX: DownloadXLSX = (
  data,
  filename = "planilha",
  sheetName = "aba 1",
) => {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const excelBuffer: ArrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  })

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  })

  // Create a link element to trigger the download
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.href = url
  link.download = `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
