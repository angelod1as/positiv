import { Button } from "~/components/atoms/button/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/account-ready-page"

const {
  dash: { DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Tudo pronto")
}

const AccountReadyPage = ({}: Route.ComponentProps) => {
  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>Sua conta está pronta! 🎉</h1>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p>
          Mas atenção: ter conta na Positiv não é o mesmo que estar em uma
          festa.
        </p>
        <p>
          Cada evento tem inscrição própria. Para ir a um evento, você precisa
          se inscrever nele — e a inscrição vale só para aquele evento.
        </p>
        <p>
          Depois que você se inscreve, a organização seleciona quem vai. Você
          recebe a resposta por email.
        </p>
      </CardContent>

      <CardFooter>
        <Button to={DASHBOARD}>Ver eventos da Positiv</Button>
      </CardFooter>
    </Card>
  )
}

export default AccountReadyPage
