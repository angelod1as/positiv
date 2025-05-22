import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes"

export default [
  // PUBLIC
  index("pages/homepage/homepage.tsx"),
  route("/auth/confirm", "pages/auth/confirm.tsx"),

  layout("pages/auth/layout.tsx", [
    ...prefix("/entrar", [
      index("pages/auth/login-page.tsx"),
      route("/esqueci", "pages/auth/forgot-password-page.tsx"),
    ]),
    route("/registrar", "pages/auth/register-page.tsx"),
  ]),

  // PRIVATE
  layout("pages/guard/private.tsx", [
    ...prefix("dashboard", [
      layout("pages/dashboard/layout.tsx", [
        index("pages/dashboard/dashboard-page.tsx"),
      ]),
      layout("pages/events/layout.tsx", [
        // Root
        route(":id/", "pages/events/event.tsx"),
        // Step 1
        route(
          ":id/regras",
          "pages/events/application/rules/event-rules-page.tsx",
        ),
        // Step 2
        route(
          ":id/dados",
          "pages/events/application/user-data/event-user-data.tsx",
        ),
      ]),

      route(
        "/download-calendar/:eventId",
        "pages/dashboard/download-calendar.route.tsx",
      ),
    ]),

    // COMMON
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
  ]),

  // ADMIN
  layout("pages/guard/admin.tsx", [
    ...prefix("admin", [
      layout("pages/admin/layout.tsx", [
        index("pages/admin/dashboard-page.tsx"),
      ]),
      ...prefix("eventos", [
        layout("pages/admin/events/layout.tsx", [
          index("pages/admin/events/events.tsx"),
          route("/:id?", "pages/admin/events/view-event.tsx"),
          route("/novo/:id?", "pages/admin/events/create-edit-event.tsx"),
        ]),
      ]),
    ]),
  ]),
] satisfies RouteConfig
