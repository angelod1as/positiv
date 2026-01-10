import { GENDERS, ORIENTATIONS } from "~/lib/constants/constants"
import {
  type Event,
  type EventParticipant,
  type EventStatus,
  type ParticipantApplicationStatus,
  type ParticipantAttendanceStatus,
  type Profile,
  type ProfileApprovedToAttendStatus,
  type ProfileFlagStatus,
} from "~types/database/entities.types"

export const profilePropMap = (property: keyof Profile) => {
  return {
    basic_data_filled: "Dados básico preenchidos?",
    cpf: "CPF",
    created_at: "Criado em",
    date_of_birth: "Data de nascimento",
    email: "E-mail",
    full_name: "Nome completo",
    social_name: "Nome social ou apelido",
    where_lives: "Em que cidade você mora?",
    how_came_to_us: "Como chegou até nós?",
    phone: "WhatsApp",
    confirm_phone: "Confirme seu whatsapp",
    rg: "RG",
    rg_issuer: "Emissor do RG",
    gender: "Gênero",
    id: "Id do perfil",
    is_veteran: "É veterane?",
    became_veteran_date: "Data que se tornou veterane",
    orientation: "Orientação",
    pronouns: "Pronomes",
    user_id: "Id de usuárie",
    approved_to_attend: "Status de Aprovação",
    flag: "Flag",
    flag_notes: "Notas da flag",
    general_notes: "Observações gerais",
    race_color: "Raça ou cor",
  }[property]
}

export const eventPropNameMap = (property: keyof Event) => {
  return {
    created_at: "Criado em",
    id: "Id do evento",
    time_application_start: "Início das inscrições",
    description: "Descrição",
    emoji: "Emoji",
    time_event_end: "Fim do evento",
    event_status: "Status",
    event_type: "Tipo de evento",
    auto_publish: "Publicação automática",
    time_group_end: "Fechamento do grupo",
    time_group_start: "Abertura do grupo",
    location: "Locação",
    time_payment_start: "Fim do pagamento",
    time_payment_end: "Início do pagamento",
    time_event_start: "Início do evento",
    ticket_price: "Valor",
    title: "Nome",
    total_spots: "Lotação",
    is_applied: "Inscrite",
    listmonk_list_id: "ID da lista Listmonk",
    listmonk_list_synced_at: "Última sincronização da lista",
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
    attendance_status: "Status de Presença",
    application_status: "Status de Processo",
    application_date: "Data de inscrição",
    cancellation_date: "Data de cancelamento",
    created_at: "Criado em",
    notes: "Notas",
    referrals: "Indicações",
    referred: "Indicade por",
    companions: "Vai acompanhade?",
    bond: "Pode ir só?",
    admin_general_notes: "Notas gerais da administração para este evento",
    emoji: "Emoji",
    title: "Título",
    spot_type: "Tipo de vaga",
    flag: "Flag",
    flag_notes: "Notas da Flag",
    updated_at: "Atualizado em",
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

const profileFlagStatus: Record<ProfileFlagStatus, string> = {
  none: "Sem flag",
  yellow: "Flag amarela",
  red: "Flag vermelha",
  gray: "Flag cinza",
}

export const participantApplicationStatusPropMap = (
  application_status: ParticipantApplicationStatus,
) => {
  return participantApplicationStatus[application_status] || ""
}

export const profileFlagStatusMap = (flag: ProfileFlagStatus) => {
  return profileFlagStatus[flag] || ""
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

const isVeteranStatusMap: Record<string, string> = {
  true: "Veterano",
  false: "Novate",
}

export const isVeteranOptions: Array<{
  name: string
  value: string
  label: string
}> = Object.entries(isVeteranStatusMap).map(([value, name]) => ({
  name: name,
  label: name,
  value: value,
}))

const hasPaidStatusMap: Record<string, string> = {
  true: "Sim",
  false: "Não",
}

export const hasPaidOptions: Array<{
  name: string
  value: string
  label: string
}> = Object.entries(hasPaidStatusMap).map(([value, name]) => ({
  name: name,
  label: name,
  value: value,
}))

export const PARTICIPANTS_TABLE_FILTER_CONFIGS = {
  application_status: {
    storageKey: "admin-participants-filter-application-status",
    options: applicationStatusOptions,
    matchMode: "custom_application_status",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  attendance_status: {
    storageKey: "admin-participants-filter-attendance-status",
    options: attendanceStatusOptions,
    matchMode: "custom_attendance_status",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  approved_to_attend: {
    storageKey: "admin-participants-filter-approved-to-attend",
    options: approvedToAttendStatusOptions,
    matchMode: "custom_approved_to_attend",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  gender: {
    storageKey: "admin-participants-filter-gender",
    options: [
      { name: "Homem cis", label: "Homem cis", value: "homem cis" },
      { name: "Mulher cis", label: "Mulher cis", value: "mulher cis" },
      {
        name: "Pessoa não binária",
        label: "Pessoa não binária",
        value: "pessoa não binária",
      },
    ] as Array<{ name: string; value: string; label: string }>,
    matchMode: "custom_gender",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  orientation: {
    storageKey: "admin-participants-filter-orientation",
    options: [
      { name: "Heterossexual", label: "Heterossexual", value: "heterossexual" },
      { name: "Bissexual", label: "Bissexual", value: "bissexual" },
      { name: "Pansexual", label: "Pansexual", value: "pansexual" },
      { name: "Assexual", label: "Assexual", value: "assexual" },
    ] as Array<{ name: string; value: string; label: string }>,
    matchMode: "custom_orientation",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  is_veteran: {
    storageKey: "admin-participants-filter-is-veteran",
    options: isVeteranOptions,
    matchMode: "custom_is_veteran",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
} as const

export const ALL_EVENT_STATUS_OPTIONS: EventStatus[] = [
  "Draft",
  "Scheduled",
  "Registration Open",
  "Registration Closed",
  "Cancelled",
  "Completed",
]

export const eventStatusOptions = ALL_EVENT_STATUS_OPTIONS.map((status) => ({
  name: eventStatusMap(status),
  value: status,
  label: eventStatusMap(status),
}))

export const DEFAULT_EVENT_STATUS_FILTER: EventStatus[] = [
  "Draft",
  "Scheduled",
  "Registration Open",
  "Registration Closed",
]

export const EVENTS_TABLE_FILTER_CONFIGS = {
  event_status: {
    storageKey: "admin-events-filter-status",
    options: eventStatusOptions,
    matchMode: "custom_event_status",
    defaultSelected: DEFAULT_EVENT_STATUS_FILTER,
    get allValues() {
      return ALL_EVENT_STATUS_OPTIONS
    },
  },
} as const

export const GENDER_FILTER_CONFIG = {
  storageKey: "admin-participants-filter-gender",
  matchMode: "custom_gender",
} as const

export const ORIENTATION_FILTER_CONFIG = {
  storageKey: "admin-participants-filter-orientation",
  matchMode: "custom_orientation",
} as const

export const flagStatusOptions: Array<{
  name: string
  value: ProfileFlagStatus
}> = Object.entries(profileFlagStatus).map(([value, name]) => ({
  name: name,
  label: name,
  value: value as ProfileFlagStatus,
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

function extractUniqueValues<T extends { [K in keyof T]: string[] | null }>(
  participants: T[],
  field: keyof T,
): string[] {
  const valuesSet = new Set<string>()

  participants.forEach((participant) => {
    const fieldValue = participant[field]
    if (Array.isArray(fieldValue)) {
      fieldValue.forEach((value) => {
        if (value && typeof value === "string") {
          valuesSet.add(value.toLowerCase())
        }
      })
    }
  })

  return Array.from(valuesSet).sort()
}

function buildFilterOptions(
  predefinedValues: readonly string[],
  extractedValues: string[],
): Array<{ name: string; value: string; label: string }> {
  const options: Array<{ name: string; value: string; label: string }> = []
  const seenLowercase = new Set<string>()
  const extractedSet = new Set(extractedValues)

  predefinedValues.forEach((value) => {
    const lowerValue = value.toLowerCase()
    if (extractedSet.has(lowerValue)) {
      seenLowercase.add(lowerValue)
      options.push({ name: value, value: lowerValue, label: value })
    }
  })

  extractedValues.forEach((lowerValue) => {
    if (!seenLowercase.has(lowerValue)) {
      seenLowercase.add(lowerValue)
      options.push({
        name: lowerValue,
        value: lowerValue,
        label: lowerValue,
      })
    }
  })

  return options
}

export const notesFilterOptions = [
  { value: "has-notes", label: "Com notas", name: "Com notas" },
  { value: "no-notes", label: "Sem notas", name: "Sem notas" },
]

export function genderFilterOptions(
  participants: Array<{ gender: string[] | null }>,
): Array<{ name: string; value: string; label: string }> {
  const extractedValues = extractUniqueValues(participants, "gender")
  return buildFilterOptions(GENDERS, extractedValues)
}

export function orientationFilterOptions(
  participants: Array<{ orientation: string[] | null }>,
): Array<{ name: string; value: string; label: string }> {
  const extractedValues = extractUniqueValues(participants, "orientation")
  return buildFilterOptions(ORIENTATIONS, extractedValues)
}
