import { SITE_SETTINGS_ID } from "../../singletons"

export type UnsetSpec = {
  ids: string[]
  unset: string[]
}

export function footerDevelopmentUnset(): UnsetSpec {
  return {
    ids: [SITE_SETTINGS_ID, `drafts.${SITE_SETTINGS_ID}`],
    unset: ["footer.development"],
  }
}
