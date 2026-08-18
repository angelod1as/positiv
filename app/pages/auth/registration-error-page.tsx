import { Link } from "~/components/atoms/link/link"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import { registrationErrorCopy } from "~/copy/auth"
import { metaCopy } from "~/copy/meta"
import { sharedCopy } from "~/copy/shared"
import paths from "~/lib/paths"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/registration-error-page"

const {
  root: { HOME },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.registrationError.title)
}

const RegistrationErrorPage = () => {
  const whatsappLink = `https://wa.me/${POSITIV_WHATSAPP}?text=${encodeURIComponent(registrationErrorCopy.whatsappMessage)}`

  return (
    <Card className="my-12">
      <CardHeader>
        <CardTitle className="text-2xl">
          {registrationErrorCopy.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Copy>{registrationErrorCopy.body}</Copy>
      </CardContent>
      <CardFooter className="flex flex-col gap-6">
        <Link
          to={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button className="w-full bg-green hover:bg-green/90">
            {registrationErrorCopy.whatsappCta}
          </Button>
        </Link>
        <Button to={HOME} variant="outline">
          {sharedCopy.actions.backHome}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default RegistrationErrorPage
