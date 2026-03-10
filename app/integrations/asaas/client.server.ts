import { env } from "~/env.server"
import { ASAAS_API_URLS, ASAAS_REQUIRED_HEADERS } from "./constants"

export function getAsaasConfig() {
  const { asaasApiKey, asaasEnvironment } = env()

  if (!asaasApiKey) {
    throw new Error("Asaas API key not configured")
  }

  return {
    baseUrl: ASAAS_API_URLS[asaasEnvironment],
    headers: {
      ...ASAAS_REQUIRED_HEADERS,
      access_token: asaasApiKey,
    },
  }
}
