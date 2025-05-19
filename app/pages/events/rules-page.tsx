import { useState } from "react"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import type { FCC } from "~types/utils.types"
import type { Route } from "./+types/rules-page"
import { RulesDialog } from "./rules-dialog"
import { RulesForm } from "./rules/rules-form/rules-form"
import { RulesText } from "./rules/rules-text"

// Empty client-loader to force Client Side Rendering only
// otherwise the random form gives a hydration error
export async function clientLoader({}: Route.ClientLoaderArgs) {}

export async function action({ request, params }: Route.ActionArgs) {
  return await applyToEvent(request, params)
}

const Wrapper: FCC = ({ children }) => (
  <>
    <RulesText />

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="mt-4">✅ Hora do teste! ✅</h2>
        </CardTitle>
        <CardDescription>
          <p>(As questões e respostas são automaticamente embaralhadas)</p>
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </>
)

export function HydrateFallback() {
  return (
    <Wrapper>
      <p>Carregando perguntas...</p>
    </Wrapper>
  )
}

const RulesPage = ({}: Route.ComponentProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <Wrapper>
      <RulesForm setIsDialogOpen={setIsDialogOpen} />
      <RulesDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
      />
    </Wrapper>
  )
}

export default RulesPage
