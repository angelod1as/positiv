import {
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components"
import { POSITIV_URL } from "~/lib/constants/constants"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { ViewEvent } from "~types/database/entities.types"
import { EmailButton } from "../common/button"
import { EmailWrapper } from "../common/wrapper"

interface ReminderEmailProps {
  event: Omit<ViewEvent, "is_applied">
}

const ReminderEmail = ({ event }: ReminderEmailProps) => {
  const { date, time } = formatDateTime(event.time_event_start)
  const { date: applicationOpenDate, time: applicationOpenTime } =
    formatDateTime(event.time_application_start)
  const { date: applicationCloseDate, time: applicationCloseTime } =
    formatDateTime(event.time_application_end)

  const details = [
    ["Evento", `${event.emoji} ${event.title}`],
    ["Local", `${event.location}`],
    ["Data do evento", `${date}`],
    ["Horário de início", `${time}`],
    ["Inscrições abrem em", `${applicationOpenDate} às ${applicationOpenTime}`],
    [
      "Inscrições fecham em",
      `${applicationCloseDate} às ${applicationCloseTime}`,
    ],
  ]

  return (
    <EmailWrapper
      pageTitle="Lembrete de inscrição em evento"
      previewText="As inscrições para o evento que você pediu para ser lembrado estão abertas!"
    >
      <Heading as="h1" className="text-center">
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
            negras, indígenas e em vulnerabilidade social. Se você é de um
            desses grupos e gostaria de participar da festa, fale com Ju ou
            Angelo pelo nosso Whatsapp.
          </li>
        </ul>
      </Section>
    </EmailWrapper>
  )
}

export default ReminderEmail

ReminderEmail.PreviewProps = {
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
} satisfies ReminderEmailProps
