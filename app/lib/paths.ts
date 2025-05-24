////////
// PUBLIC
////////
const HOME = "/"
const LOGIN = "/entrar"
const FORGOT_PASSWORD = `${LOGIN}/esqueci`
const LOGON = "/registrar"
const LOGON_CALLBACK = `${LOGON}/callback`
const LOGON_CONFIRM = `${LOGON}/confirm`

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
const GENDER_PRONOUNS_ORIENTATION = `${ACCOUNT}/dados-basicos-cont`
const AGREE_TO_TERMS = `${ACCOUNT}/termos`

//// USER
// EVENTS
const EVENT_VIEW = (id: string) => `${DASHBOARD}/${id}`
const EVENT_RULES = (id: string) => `${EVENT_VIEW(id)}/regras`
const EVENT_DATA = (id: string) => `${EVENT_VIEW(id)}/dados`

//// ADMIN
const ADMIN_DASHBOARD = "/admin"
// EVENTS
const ADMIN_EVENTS = `${ADMIN_DASHBOARD}/eventos`
const ADMIN_VIEW_EVENT = (id: string) => `${ADMIN_EVENTS}/${id}`
const ADMIN_EDIT_EVENT = (id: string) => `${ADMIN_EVENTS}/novo/${id}`
const ADMIN_CREATE_EVENT = `${ADMIN_EVENTS}/novo`

const paths = {
  root: {
    HOME,
  },
  admin: {
    ADMIN_DASHBOARD,
    events: {
      ADMIN_EDIT_EVENT,
      ADMIN_VIEW_EVENT,
      ADMIN_EVENTS,
      ADMIN_CREATE_EVENT,
    },
  },
  auth: {
    LOGIN,
    FORGOT_PASSWORD,
    LOGON,
    LOGON_CALLBACK,
    LOGON_CONFIRM,
  },
  dash: {
    DASHBOARD,
    account: {
      ACCOUNT,
      CHANGE_PASSWORD,
      BASIC_DATA,
      GENDER_PRONOUNS_ORIENTATION,
    },
    events: {
      EVENT_VIEW,
      EVENT_RULES,
      EVENT_DATA,
    },
    participant: {
      DASHBOARD,
      DOWNLOAD_CALENDAR,
      AGREE_TO_TERMS,
    },
  },
}

export default paths
