export const phoneToWhatsAppLink = (phone: unknown) => {
  if (!phone) return undefined
  const cleanedPhone = phone.toString().replace(" ", "").replace("-", "")
  if (cleanedPhone.length === 11) return `https://wa.me/55${phone}`
  return `https://wa.me/${phone}`
}
