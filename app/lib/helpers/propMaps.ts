import type { Event, EventStatus } from "~types/entities.types"

export const eventPropNameMap = (property: keyof Event) => {
  return {
    created_at: "Criado em",
    id: "ID",
    application_close_time: "Fim inscrições",
    application_open_time: "Início inscrições",
    description: "Descrição",
    emoji: "Emoji",
    ending_time: "Fim",
    event_status: "Status",
    group_close_date: "Fechamento grupo",
    group_open_date: "Abertura grupo",
    interview_process_end: "Fim entrevistas",
    interview_process_start: "Início entrevistas",
    location: "Locação",
    payment_end_date: "Fim pagto",
    payment_start_date: "Início pagto",
    starting_time: "Início",
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
