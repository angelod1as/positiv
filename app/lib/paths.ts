////////
// PUBLIC
////////
const HOME = "/"
const LOGIN = "/entrar"
const FORGOT_PASSWORD = `${LOGIN}/esqueci`
const LOGON = "/registrar"
const LOGON_EMAIL_MESSAGE = `${LOGON}/confirmar-email`
const REGISTRATION_ERROR = `${LOGON}/erro`
const LOGON_CALLBACK = "/auth/confirm"
const LOGON_CONFIRM = `${LOGON}/confirm`
const CODE_OF_CONDUCT = `/codigo-de-conduta`
const FEEDBACK = `/feedback`

////////
// PRIVATE
////////
const DASHBOARD = "/dashboard"
const DOWNLOAD_CALENDAR = (eventId: string) =>
  `${DASHBOARD}/download-calendar/${eventId}`

// ACCOUNT
const ACCOUNT = `/conta`
const CHANGE_PASSWORD = `${ACCOUNT}/mudar-senha`
const BASIC_DATA = `${ACCOUNT}/dados-basicos`
const AGREE_TO_TERMS = `${ACCOUNT}/termos-e-condicoes`
const ACCOUNT_READY = `${ACCOUNT}/tudo-pronto`

//// USER
// EVENTS
const EVENT_VIEW = (id: string) => `${DASHBOARD}/${id}`
const EVENT_RULES = (id: string) => `${EVENT_VIEW(id)}/regras`
const EVENT_DATA = (id: string) => `${EVENT_VIEW(id)}/dados`
const EVENT_RULES_QUIZ_CHECK = (id: string) => `/api/events/${id}/rules-quiz`
const EVENT_APPLICATION_SENT = (id: string) =>
  `${EVENT_VIEW(id)}/candidatura-enviada`
const REGISTER_COMMIT = "/api/auth/register"
const BASIC_DATA_COMMIT = "/api/account/dados-basicos"

//// ADMIN
const ADMIN_DASHBOARD = "/admin"
// PARTICIPANTS
const ADMIN_PARTICIPANTS = `${ADMIN_DASHBOARD}/participantes`
const ADMIN_VIEW_PARTICIPANT = (profileId: string) =>
  `${ADMIN_PARTICIPANTS}/${profileId}`
// FEEDBACKS
const ADMIN_FEEDBACKS = `${ADMIN_DASHBOARD}/feedbacks`
// DATAVIZ
const ADMIN_DATAVIZ = `${ADMIN_DASHBOARD}/numeros`
// EVENTS
const ADMIN_EVENTS = `${ADMIN_DASHBOARD}/eventos`
const ADMIN_VIEW_EVENT = (id: string) => `${ADMIN_EVENTS}/${id}`
const ADMIN_EDIT_EVENT = (id: string) => `${ADMIN_EVENTS}/novo/${id}`
const ADMIN_DOWNLOAD_EVENT = (id: string) => `${ADMIN_EVENTS}/${id}/baixar`
const ADMIN_CREATE_EVENT = `${ADMIN_EVENTS}/novo`
const ADMIN_EVENT_VIEW_PARTICIPANT = (eventId: string, participantId: string) =>
  `${ADMIN_EVENTS}/${eventId}/participantes/${participantId}`

const paths = {
  root: {
    HOME,
    CODE_OF_CONDUCT,
    FEEDBACK,
  },
  admin: {
    ADMIN_DASHBOARD,
    ADMIN_PARTICIPANTS,
    ADMIN_VIEW_PARTICIPANT,
    ADMIN_FEEDBACKS,
    ADMIN_DATAVIZ,
    events: {
      ADMIN_EDIT_EVENT,
      ADMIN_VIEW_EVENT,
      ADMIN_DOWNLOAD_EVENT,
      ADMIN_EVENTS,
      ADMIN_CREATE_EVENT,
      ADMIN_EVENT_VIEW_PARTICIPANT,
    },
  },
  auth: {
    LOGIN,
    FORGOT_PASSWORD,
    LOGON,
    LOGON_CALLBACK,
    LOGON_CONFIRM,
    LOGON_EMAIL_MESSAGE,
    REGISTRATION_ERROR,
    REGISTER_COMMIT,
  },
  dash: {
    DASHBOARD,
    account: {
      ACCOUNT,
      CHANGE_PASSWORD,
      BASIC_DATA,
      BASIC_DATA_COMMIT,
      ACCOUNT_READY,
    },
    events: {
      EVENT_VIEW,
      EVENT_RULES,
      EVENT_RULES_QUIZ_CHECK,
      EVENT_DATA,
      EVENT_APPLICATION_SENT,
    },
    participant: {
      DASHBOARD,
      DOWNLOAD_CALENDAR,
      AGREE_TO_TERMS,
    },
  },
}

export default paths
