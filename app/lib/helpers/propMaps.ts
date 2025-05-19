import type { Event, EventStatus } from "~types/entities.types"

export const eventPropNameMap = (property: keyof Event) => {
  return {
    created_at: "Criado em",
    id: "ID",
    time_application_end: "Fim inscrições",
    time_application_start: "Início inscrições",
    description: "Descrição",
    emoji: "Emoji",
    time_event_end: "Fim",
    event_status: "Status",
    time_group_end: "Fechamento grupo",
    time_group_start: "Abertura grupo",
    time_interviews_end: "Fim entrevistas",
    time_interviews_start: "Início entrevistas",
    location: "Locação",
    time_payment_start: "Fim pagto",
    time_payment_end: "Início pagto",
    time_event_start: "Início",
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
