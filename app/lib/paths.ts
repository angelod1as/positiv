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
const ACCOUNT = `/conta`
const CHANGE_PASSWORD = `${ACCOUNT}/mudar-senha`
const BASIC_DATA = `${ACCOUNT}/dados-basicos`
const GENDER_PRONOUNS_ORIENTATION = `${ACCOUNT}/dados-basicos-cont`
const AGREE_TO_TERMS = `${ACCOUNT}/termos`

//// USER
// PROFILE
// EVENTS
const EVENT_VIEW = (id: string) => `${DASHBOARD}/${id}`

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
    account: {
      ACCOUNT,
      CHANGE_PASSWORD,
      BASIC_DATA,
      GENDER_PRONOUNS_ORIENTATION,
    },
    participant: {
      DASHBOARD,
      AGREE_TO_TERMS,
      events: {
        EVENT_VIEW,
      },
    },
  },
}

export default paths
