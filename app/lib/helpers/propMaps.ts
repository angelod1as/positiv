import type {
  Event,
  EventStatus,
  ParticipantProcessStatus,
  Profile,
} from "~types/entities.types"
import type { Database } from "~types/kysely.types"

export const profilePropMap = (property: keyof Profile) => {
  return {
    allow_marketing_email: "Autorizou email marketing?",
    basic_data_filled: "Dados básico preenchidos?",
    cpf: "CPF",
    created_at: "Criado em",
    date_of_birth: "Data de nascimento",
    email: "E-mail",
    full_name: "Nome completo",
    social_name: "Nome social ou apelido",
    where_lives: "Em que cidade você mora?",
    how_came_to_us: "Como chegou até nós?",
    phone: "Whatsapp",
    confirm_phone: "Confirme seu whatsapp",
    rg: "RG",
    rg_issuer: "Emissor do RG",
    gender: "Gênero",
    id: "Id de perfil",
    is_veteran: "É veterane?",
    orientation: "Orientação",
    pronouns: "Pronomes",
    user_id: "Id de usuárie",
  }[property]
}

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
    is_set_reminder: "Lembrete ativado",
  }[property]
}

export const eventParticipantPropMap = (
  property: keyof Database["event_participants"],
) => {
  return {
    id: "Id",
    profile_id: "Id do perfil",
    event_id: "Id do evento",
    is_user_applied: "Inscrite?",
    payment: "Pagamento",
    process_status: "Status",
    application_date: "Data de inscrição",
    cancellation_date: "Data de cancelamento",
    created_at: "Criado em",
    notes: "Notas",
    referrals: "Indicações",
    companions: "Vai acompanhade?",
    bond: "Pode ir só?",
    is_social_spot: "É vaga social?",
    emoji: "Emoji",
    title: "Título",
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

export const newsletterStatusPropMap = (status: string) => {
  return (
    {
      draft: "Rascunho",
      sent: "Enviado",
    }[status] || ""
  )
}
