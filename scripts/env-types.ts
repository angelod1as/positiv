// varlock fetches each item's icon from api.iconify.design with a 2-second
// timeout and drops it silently when the fetch fails, which also collapses a
// JSDoc block left with one line. Whether env.d.ts carries icons therefore
// depends on the network, not on .env.schema, so they are left out of the
// comparison.
export function withoutIcons(source: string): string {
  return source
    .replace(/^ *\* !\[icon\]\(data:[^)]*\) *\n/gm, "")
    .replace(/\/\*\*\n *\* (.*?) *\n *\*\//g, "/** $1 */")
    .replace(/ +$/gm, "")
}
