import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes"

export default [
  index("pages/homepage/homepage.tsx"),
  route("/auth/confirm", "pages/auth/confirm.tsx"),

  layout("pages/auth/layout.tsx", [
    ...prefix("/entrar", [
      index("pages/auth/login-page.tsx"),
      route("/esqueci", "pages/auth/forgot-password-page.tsx"),
    ]),
    route("/registrar", "pages/auth/register-page.tsx"),
  ]),

  ...prefix("dashboard", [
    index("pages/dashboard/dashboard-page.tsx"),
    layout("pages/events/layout.tsx", [
      route(":id", "pages/events/rules-page.tsx"),
    ]),

    route(
      "/download-calendar/:eventId",
      "pages/dashboard/download-calendar.route.tsx",
    ),
  ]),

  layout("pages/account/layout.tsx", [
    ...prefix("conta", [
      index("pages/account/account-page.tsx"),
      route(
        "/termos",
        "pages/dashboard/agree-to-terms-page/agree-to-terms-page.tsx",
      ),
      route("/mudar-senha", "pages/account/change-password-page.tsx"),
      route("/dados-basicos", "pages/account/basic-data/basic-data-page.tsx"),
      route(
        "/dados-basicos-cont",
        "pages/account/basic-data/gender-pronouns-orientation-page.tsx",
      ),
    ]),
  ]),
] satisfies RouteConfig
