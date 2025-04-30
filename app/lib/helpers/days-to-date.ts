export const calculateDaysToDate = (date: Date) => {
  date.setHours(0, 0, 0, 0) // Normalize to midnight

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to midnight

  const timeDifference = date.getTime() - today.getTime()
  const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24))

  return daysDifference
}
