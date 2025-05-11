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

    layout("pages/dashboard/agree-to-terms-page/layout.tsx", [
      // TODO: change this route
      route(
        "/termos",
        "pages/dashboard/agree-to-terms-page/agree-to-terms-page.tsx",
      ),
    ]),

    layout("pages/events/layout.tsx", [
      route(":id", "pages/events/rules-page.tsx"),
    ]),
  ]),

  layout("pages/account/layout.tsx", [
    ...prefix("conta", [
      index("pages/account/account-page.tsx"),
      route("/mudar-senha", "pages/account/change-password-page.tsx"),
      route("/dados-basicos", "pages/account/basic-data/basic-data-page.tsx"),
    ]),
  ]),
] satisfies RouteConfig
