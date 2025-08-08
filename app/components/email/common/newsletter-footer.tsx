import { Hr, Link, Section, Text } from "@react-email/components"
import { POSITIV_URL } from "~/lib/constants/constants"

interface NewsletterFooterProps {
  unsubscribeUrl: string
}

export const NewsletterFooter = ({ unsubscribeUrl }: NewsletterFooterProps) => {
  return (
    <Section className="text-center text-gray-500">
      <Hr />
      <Text className="text-xs">
        Você está recebendo este e-mail porque se cadastrou no site da{" "}
        <Link href={POSITIV_URL}>Positiv</Link> e optou por receber nossas novidades.
      </Text>
      <Text className="text-xs">
        Se não deseja mais receber nossos e-mails,{" "}
        <Link href={unsubscribeUrl}>clique aqui para se descadastrar</Link>.
      </Text>
      <Text className="text-xs text-gray-400 mt-4">
        © {new Date().getFullYear()} Positiv Party - Todos os direitos reservados
      </Text>
    </Section>
  )
}