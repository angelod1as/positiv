import { Link } from "~/components/atoms/link/link"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

import { Button } from "~/components/atoms/button/button"
import paths from "~/lib/paths"
import type { Route } from "./+types/confirm-email-message-page"

const {
  root: { HOME },
  auth: { FORGOT_PASSWORD },
} = paths

const ConfirmEmailMessagePage = ({}: Route.ComponentProps) => {
  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">Confirme sua conta</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p>
          Clique no link na mensagem enviada para seu email para confirmar sua
          conta.
        </p>
        <p className="text-sm">
          Não esqueça de checar a caixa de Spam ou as caixas de Promoções do
          Gmail.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-6">
        <Button to={HOME}>Voltar para a home</Button>
        <p className="text-sm">
          Se a mensagem demorar mais que 5 minutos para chegar, tente novamente.
          Se mesmo assim não der certo, tente o processo de{" "}
          <Link to={FORGOT_PASSWORD}>"esqueci minha senha"</Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default ConfirmEmailMessagePage
