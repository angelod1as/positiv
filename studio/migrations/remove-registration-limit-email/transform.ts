import { EMAIL_TEMPLATES_ID } from "../../singletons"

export type UnsetSpec = {
  ids: string[]
  unset: string[]
}

export function registrationLimitEmailUnset(): UnsetSpec {
  return {
    ids: [EMAIL_TEMPLATES_ID, `drafts.${EMAIL_TEMPLATES_ID}`],
    unset: ["registrationLimit"],
  }
}
