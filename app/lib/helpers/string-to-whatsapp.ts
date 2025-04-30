export const stringToWhatsapp = (phone: string): string => {
  const cleanedPhone = phone.replace(/\D/g, "")

  let countryCode = "55" // Default BR
  let stateCode = "11" // Default SP
  let phoneNumber = cleanedPhone

  if (cleanedPhone.startsWith("55")) {
    countryCode = "55"
    phoneNumber = cleanedPhone.substring(2)
    if (phoneNumber.length >= 2) {
      stateCode = phoneNumber.substring(0, 2)
      phoneNumber = phoneNumber.substring(2)
    }
  } else if (cleanedPhone.length >= 2 && !cleanedPhone.startsWith("0")) {
    stateCode = cleanedPhone.substring(0, 2)
    phoneNumber = cleanedPhone.substring(2)
  }

  // Ensure state code has exactly two digits
  if (stateCode.length === 1) {
    stateCode = "0" + stateCode
  } else if (stateCode.length > 2) {
    // If the part that could be the state code is longer than 2 digits,
    // we assume the first two are the state code and the rest is part of the phone number.
    phoneNumber = stateCode.substring(2) + phoneNumber
    stateCode = stateCode.substring(0, 2)
  }

  return `https://wa.me/${countryCode}${stateCode}${phoneNumber}`
}
