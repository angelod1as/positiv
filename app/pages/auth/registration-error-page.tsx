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
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"

const {
  root: { HOME },
} = paths

const RegistrationErrorPage = () => {
  const errorMessage = "Olá! Tive o erro ERR-001 ao criar minha conta"
  const whatsappLink = `https://wa.me/${POSITIV_WHATSAPP}?text=${encodeURIComponent(errorMessage)}`

  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">Erro ao criar conta</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p>
          Houve um erro ao criar sua conta. Entre em contato com o nosso
          WhatsApp e informe o erro <strong>ERR-001</strong>.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-6">
        <Link
          to={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button className="w-full bg-green hover:bg-green/90">
            Falar pelo WhatsApp
          </Button>
        </Link>
        <Button to={HOME} variant="outline">
          Voltar para a home
        </Button>
      </CardFooter>
    </Card>
  )
}

export default RegistrationErrorPage
