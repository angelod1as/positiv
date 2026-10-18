// Any {{...}} token, not just \w+ ones, so a malformed or Handlebars-ish token
// like {{ nome-completo }}, {{#if x}} or {{}} is caught and rejected rather
// than slipping through as literal braces an Editor would publish.
const variablePattern = /\{\{([^{}]*)\}\}/g

export function unknownVariables(
  template: string,
  whitelist: readonly string[],
): string[] {
  const unknown = new Set<string>()
  for (const match of template.matchAll(variablePattern)) {
    const name = match[1].trim()
    if (!whitelist.includes(name)) unknown.add(name)
  }
  return [...unknown]
}

export function renderTemplate(
  template: string,
  values: Record<string, string>,
  whitelist: readonly string[],
): string {
  const unknown = unknownVariables(template, whitelist)
  if (unknown.length > 0) {
    throw new Error(
      `The template uses unknown variables: ${unknown
        .map((name) => `{{${name}}}`)
        .join(", ")}`,
    )
  }

  return template.replace(
    variablePattern,
    (_match, name: string) => values[name.trim()],
  )
}
