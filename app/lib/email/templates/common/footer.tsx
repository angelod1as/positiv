import { Hr, Link, Section, Text } from "@react-email/components"
import { POSITIV_URL } from "~/lib/helpers/constants"

export const EmailFooter = () => {
  return (
    <Section className="text-center  text-gray-500">
      <Hr />
      <Text className="text-xs">
        Você recebeu este e-mail pois se cadastrou no site da{" "}
        <Link href={POSITIV_URL}>Positiv</Link>
      </Text>
      <Text className="text-xs">
        Acesse suas <Link href={POSITIV_URL}>configurações</Link> para se
        descadastrar
      </Text>
    </Section>
  )
}
