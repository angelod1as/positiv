import { loadRules } from "~/business/cms/load-rules.server"
import { RulesAndAgreements } from "~/components/pages/rules/rules-and-agreements"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/rules-page"

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.rules.title)
}

export async function loader() {
  return { rules: await loadRules() }
}

const RulesPage = ({ loaderData }: Route.ComponentProps) => (
  <RulesAndAgreements rules={loaderData.rules} />
)

export default RulesPage
