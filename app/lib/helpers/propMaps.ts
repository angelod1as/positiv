import {
  type Event,
  type EventParticipant,
  type EventStatus,
  type ParticipantApplicationStatus,
  type ParticipantAttendanceStatus,
  type Profile,
  type ProfileApprovedToAttendStatus,
} from "~types/entities.types"

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
    id: "Id do perfil",
    is_veteran: "É veterane?",
    orientation: "Orientação",
    pronouns: "Pronomes",
    user_id: "Id de usuárie",
    approved_to_attend: "Aprovade",
  }[property]
}

export const eventPropNameMap = (property: keyof Event) => {
  return {
    created_at: "Criado em",
    id: "Id do evento",
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

export const eventParticipantPropMap = (property: keyof EventParticipant) => {
  return {
    id: "Id do participante",
    profile_id: "Id do perfil",
    event_id: "Id do evento",
    is_user_applied: "Inscrite?",
    has_paid: "Pago?",
    payment: "Pagamento",
    attendance_status: "Status",
    application_status: "Processo",
    application_date: "Data de inscrição",
    cancellation_date: "Data de cancelamento",
    created_at: "Criado em",
    notes: "Notas",
    referrals: "Indicações",
    companions: "Vai acompanhade?",
    bond: "Pode ir só?",
    admin_general_notes: "Notas gerais da administração para este evento",
    emoji: "Emoji",
    title: "Título",
    spot_type: "Tipo de vaga",
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

const participantApplicationStatus: Record<
  ParticipantApplicationStatus,
  string
> = {
  pending: "Pendente",
  talking: "Conversando",
  sent_payment_data: "Dados de pagto enviados",
  sent_rules: "Regras enviadas",
  think_better: "Pensar melhor",
  finalised: "Finalizado",
}

const participantAttendanceStatus: Record<ParticipantAttendanceStatus, string> =
  {
    pending: "Pendente",
    attended: "Compareceu",
    "not-attended": "Não compareceu",
    skipped: "Pulade (rodízio)",
    "will-not-go": "Não vai",
  }

const profileApprovedToAttendStatus: Record<
  ProfileApprovedToAttendStatus,
  string
> = {
  pending: "Pendente",
  approved: "Aprovade",
  approved_with_reservations: "Aprovade com Ressalvas",
  rejected: "Rejeitade",
}

export const participantApplicationStatusPropMap = (
  application_status: ParticipantApplicationStatus,
) => {
  return participantApplicationStatus[application_status] || ""
}

export const applicationStatusOptions: Array<{
  name: string
  value: ParticipantApplicationStatus
}> = Object.entries(participantApplicationStatus).map(([value, name]) => ({
  name: name,
  label: name,
  value: value as ParticipantApplicationStatus,
}))

export const attendanceStatusOptions: Array<{
  name: string
  value: ParticipantAttendanceStatus
}> = Object.entries(participantAttendanceStatus).map(([value, name]) => ({
  name: name,
  label: name,
  value: value as ParticipantAttendanceStatus,
}))

export const approvedToAttendStatusOptions: Array<{
  name: string
  value: ProfileApprovedToAttendStatus
}> = Object.entries(profileApprovedToAttendStatus).map(([value, name]) => ({
  name: name,
  label: name,
  value: value as ProfileApprovedToAttendStatus,
}))

const participantSpotType: Record<string, string> = {
  regular: "Regular",
  social: "Social",
  staff: "Staff",
}

export const participantSpotTypePropMap = (spot_type: string) => {
  return participantSpotType[spot_type] || ""
}

export const spotTypeOptions: Array<{
  name: string
  value: string
}> = Object.entries(participantSpotType).map(([value, name]) => ({
  name: name,
  label: name,
  value: value,
}))
