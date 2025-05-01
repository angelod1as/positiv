// PUBLIC
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

// ACCOUNT
const ACCOUNT = `${DASHBOARD}/conta`
const RESET_PASSWORD = `${ACCOUNT}/resetar-senha`
const BASIC_DATA = `${ACCOUNT}/dados-basicos`
const CREATE_BASIC_DATA = `${BASIC_DATA}/criar`
const EDIT_BASIC_DATA = `${BASIC_DATA}`

//// ADMIN
const ADMIN_DASHBOARD = `${DASHBOARD}/admin`
// ADMIN_EVENTS
const ADMIN_EVENTS = `${ADMIN_DASHBOARD}/eventos`
const ADMIN_EVENT_VIEW = (id: string) => `${ADMIN_EVENTS}/${id}`
const ADMIN_EVENT_CREATE = `${ADMIN_EVENTS}/novo`
const ADMIN_EVENT_EDIT = (id: string) => `${ADMIN_EVENT_VIEW(id)}/editar`

//// USER
// PROFILE
const AGREE_TO_TERMS = `${DASHBOARD}/termos`
// EVENTS
const EVENTS = `${DASHBOARD}/eventos` // Rota que redireciona
const EVENT_VIEW = (id: string) => `${EVENTS}/${id}`
const EVENT_RULES = (id: string) => `${EVENT_VIEW(id)}/regras`

const paths = {
  root: {
    HOME,
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
    admin: {
      ADMIN_DASHBOARD,
      events: {
        ADMIN_EVENTS,
        ADMIN_EVENT_VIEW,
        ADMIN_EVENT_CREATE,
        ADMIN_EVENT_EDIT,
      },
    },
    account: {
      ACCOUNT,
      RESET_PASSWORD,
      basicData: {
        CREATE: CREATE_BASIC_DATA,
        EDIT: EDIT_BASIC_DATA,
      },
    },
    participant: {
      DASHBOARD,
      AGREE_TO_TERMS,
      events: {
        EVENT_RULES,
      },
    },
  },
}

export default paths
