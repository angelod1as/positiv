function generateRandomString(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export function createMockCredentials(): { email: string; password: string } {
  const randomString = generateRandomString(10) // Generate a random string for the email
  const email = `${randomString}@example.com`
  const password = generateRandomString(12) // Generate a random password

  return { email, password }
}
