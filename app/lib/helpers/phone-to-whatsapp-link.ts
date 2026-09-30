export const phoneToWhatsAppLink = (
  phone: unknown,
  isInternational = false,
) => {
  if (!phone) return undefined
  if (isInternational) return `https://wa.me/${phone}`
  const cleanedPhone = phone.toString().replace(" ", "").replace("-", "")
  if (cleanedPhone.length === 11) return `https://wa.me/55${phone}`
  return `https://wa.me/${phone}`
}
