import {
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components"
import dotenv from "dotenv"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { ProfileWithRoles, ViewEvent } from "~types/entities.types"
import { EmailWrapper } from "../common/wrapper"
dotenv.config()

interface ApplicationMailProps {
  profile: NonNullable<ProfileWithRoles>
  event: Omit<ViewEvent, "is_applied">
}

const ApplicationMail = ({ profile, event }: ApplicationMailProps) => {
  const { date, time } = formatDateTime(event.time_event_start)
  const details = [
    ["Evento", `${event.emoji} ${event.title}`],
    ["Local", `${event.location}`],
    ["Data", `${date}`],
    ["Horário de início", `${time}`],
  ]

  return (
    <EmailWrapper
      pageTitle="Inscrição em evento"
      previewText="Veja as informações do evento que você se inscreveu"
    >
      <Heading as="h1" className="text-center">
        Sua inscrição foi recebida
      </Heading>
      <Text>
        {profile.social_name ? profile.social_name : profile.full_name}, você se
        inscreveu com sucesso no evento{" "}
        <b>
          {event.emoji}&nbsp;{event.title}
        </b>
        !
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
      </Section>
    </EmailWrapper>
  )
}

export default ApplicationMail

ApplicationMail.PreviewProps = {
  event: {
    id: "123",
    title: "Rapa do Tacho",
    description: "Quentão, pipoca e fogueira!",
    emoji: "🔥",
    event_status: "Registration Open",
    time_application_start: "2030-01-01T00:00:00.000Z",
    time_application_end: "2030-01-01T10:00:00.000Z",
    time_event_start: "2030-02-01T00:00:00.000Z",
    time_event_end: "2030-02-01T10:00:00.000Z",
    location: "Motel Internet",
    ticket_price: 200,
    time_group_start: "2030-01-12T00:00:00.000Z",
    time_group_end: "2030-01-13T00:00:00.000Z",
    time_interviews_start: "2030-01-07T00:00:00.000Z",
    time_interviews_end: "2030-01-08T00:00:00.000Z",
    time_payment_end: "2030-01-10T00:00:00.000Z",
    time_payment_start: "2030-01-11T00:00:00.000Z",
  },
  profile: {
    id: "f93ea183-7a0e-4ed6-b248-f08516c965ad",
    email: "user2@example.com",
    created_at: "2025-05-11 19:18:12.140265+00",
    basic_data_filled: true,
    full_name: "User Two Full Name",
    social_name: "User Two",
    rg: "987654321",
    cpf: "12345678999",
    pronouns: ["ela/dela"],
    phone: 21912345678,
    date_of_birth: "1995-10-20",
    gender: ["Mulher cis"],
    orientation: ["Hétero"],
    where_lives: "Rio de Janeiro, RJ",
    how_came_to_us: "Referred by Friend",
    rg_issuer: "SSP/RJ",
    allow_marketing_email: true,
    is_admin: false,
  },
} satisfies ApplicationMailProps
