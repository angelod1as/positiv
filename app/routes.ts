import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes"

export default [
  index("pages/homepage/homepage.tsx"),

  layout("pages/auth/layout.tsx", [
    route("/entrar", "pages/auth/login-page.tsx"),
    route("/registrar", "pages/auth/register-page.tsx"),
  ]),

  ...prefix("dashboard", [
    index("pages/dashboard/dashboard-page.tsx"),
    ...prefix("eventos", [
      index("pages/events/events-page.tsx"),
      route(":id", "pages/events/event-page.tsx"), // TODO: Id?
    ]),
    layout("pages/dashboard/agree-to-terms-page/layout.tsx", [
      route(
        "/termos",
        "pages/dashboard/agree-to-terms-page/agree-to-terms-page.tsx",
      ),
    ]),
  ]),

  layout("pages/account/layout.tsx", [
    ...prefix("conta", [
      index("pages/account/account-page.tsx"),
      route("/mudar-senha", "pages/account/change-password-page.tsx"),
      route("/dados-basicos", "pages/account/basic-data/basic-data-page.tsx"),
    ]),
  ]),

  // Debug route for Chrome DevTools
  route(
    "/.well-known/appspecific/com.chrome.devtools.json",
    "pages/debug-null/debug-null.ts",
  ),
] satisfies RouteConfig
