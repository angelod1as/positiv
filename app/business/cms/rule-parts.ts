// Imported by the Studio too, so it stays free of imports.
export const publicRuleParts = ["generalRules", "agreements"] as const

export const ruleParts = [...publicRuleParts, "privateRules"] as const

export type RulePart = (typeof ruleParts)[number]

export type PublicRulePart = (typeof publicRuleParts)[number]
