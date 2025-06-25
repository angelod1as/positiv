import type { Newsletter } from "~types/entities.types"
import { EmailWrapper } from "../common/wrapper"

interface NewsletterEmailProps {
  newsletter: Newsletter
}

export const NewsletterEmail = ({ newsletter }: NewsletterEmailProps) => {
  return (
    <EmailWrapper
      pageTitle={newsletter.subject}
      previewText="Novidades da Positiv para você!"
    >
      Angelo
      {/* <Heading as="h1" className="text-center">
        Inscrições abertas!
      </Heading>
      <Text>
        Surpresa! As inscrições para o evento{" "}
        <b>
          {event.emoji}&nbsp;{event.title}
        </b>{" "}
        estão abertas!
      </Text>
      <div className="text-center">
        <EmailButton href={POSITIV_URL}>Inscreva-se já!</EmailButton>
      </div>
      <Text>
        Você pediu para ser lembrado quando as inscrições abrissem, e estamos
        aqui para isso.
      </Text>
      <Text>
        🫡 <i>Servir bem para servir sempre</i> 🫡
      </Text>
      <Section className="text-sm">
        {details.map(([label, value]) => (
          <Row key={label}>
            <Column>
              {label}: <b>{value}</b>
            </Column>
          </Row>
        ))}
      </Section>
      <Hr />
      <Section>
        <Heading as="h3">Importante!</Heading>
        <Text>Não se esqueça:</Text>
        <ul className="text-sm">
          <li>
            Ter participado de edições anteriores <b>não garante</b> a sua
            participação em outras festas;
          </li>
          <li>
            Se você quer ir acompanhade, <b>todas as pessoas</b> precisam se
            inscrever e passar pela entrevista;
          </li>
          <li>
            Inscrever-se no formulário <b>não significa</b> que você será
            selecionade para participar do evento;
          </li>
          <li>
            Temos políticas de <b>entradas sociais</b> para pessoas trans,
            negras, pardas, indígenas e em vulnerabilidade social. Se você é de
            um desses grupos e gostaria de participar da festa, fale com Ju ou
            Angelo pelo nosso Whatsapp.
          </li>
        </ul>
      </Section> */}
    </EmailWrapper>
  )
}

export default NewsletterEmail

NewsletterEmail.PreviewProps = {} satisfies NewsletterEmailProps
