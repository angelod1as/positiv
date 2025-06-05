import type {
  Event,
  EventStatus,
  ParticipantProcessStatus,
} from "~types/entities.types"

export const eventPropNameMap = (property: keyof Event) => {
  return {
    created_at: "Criado em",
    id: "ID",
    time_application_end: "Fim das inscrições",
    time_application_start: "Início das inscrições",
    description: "Descrição",
    emoji: "Emoji",
    time_event_end: "Fim do evento",
    event_status: "Status",
    time_group_end: "Fechamento do grupo",
    time_group_start: "Abertura do grupo",
    time_interviews_end: "Fim das entrevistas",
    time_interviews_start: "Início das entrevistas",
    location: "Locação",
    time_payment_start: "Fim do pagamento",
    time_payment_end: "Início do pagamento",
    time_event_start: "Início do evento",
    ticket_price: "Valor",
    title: "Nome",
    total_spots: "Lotação",
    is_applied: "Inscrite",
  }[property]
}

export const eventStatusMap = (event_status: EventStatus) => {
  return (
    {
      Draft: "Rascunho",
      Scheduled: "Agendado",
      "Registration Open": "Inscrições abertas",
      "Registration Closed": "Inscrições encerradas",
      Cancelled: "Cancelado",
      Completed: "Finalizado",
      "Already Applied": "Já inscrite",
    }[event_status] || ""
  )
}

export const participantProcessStatusPropMap = (
  process_status: ParticipantProcessStatus,
) => {
  return (
    {
      applied: "Inscrite",
      talking: "Conversando",
      sent_payment_data: "Dados de pagto enviados",
      paid: "Pago",
      sent_rules: "Regras enviadas",
      think_better: "Pensar melhor",
    }[process_status] || ""
  )
}
