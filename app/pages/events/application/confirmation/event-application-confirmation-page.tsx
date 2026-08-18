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
import type { Route } from "./+types/event-application-confirmation-page"

const {
  dash: { DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Candidatura enviada")
}

const EventApplicationConfirmationPage = ({}: Route.ComponentProps) => {
  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>Candidatura enviada! 🎉</h1>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p>Recebemos sua candidatura para esse evento.</p>
        <p>
          Mas atenção: <b>uma candidatura não garante uma vaga.</b> Agora a
          organização seleciona quem vai e entra em contato via Whatsapp. Somos
          uma equipe minúscula que conversa com cada pessoa candidata, então o
          processo leva tempo.
        </p>
        <p>
          Enquanto isso, um e-mail com os detalhes do evento está a caminho —
          ele pode demorar alguns minutos para chegar, e vale olhar a caixa de
          spam.
        </p>
      </CardContent>

      <CardFooter>
        <Button to={DASHBOARD}>Voltar para o painel</Button>
      </CardFooter>
    </Card>
  )
}

export default EventApplicationConfirmationPage
