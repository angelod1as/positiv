import { validatePreviewUrl } from "@sanity/preview-url-secret"
import { urlSearchParamPreviewSecret } from "@sanity/preview-url-secret/constants"
import { createDraftReadClient } from "./draft-read-client.server"

export function hasPreviewSecret(url: string): boolean {
  return new URL(url).searchParams.has(urlSearchParamPreviewSecret)
}

export function validatePreviewRequest(url: string) {
  return validatePreviewUrl(createDraftReadClient(), url)
}
