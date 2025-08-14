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
  route("/unsubscribe/:token", "pages/unsubscribe/unsubscribe-page.tsx"),

  layout("pages/auth/layout.tsx", [
    ...prefix("/entrar", [
      index("pages/auth/login-page.tsx"),
      route("/esqueci", "pages/auth/forgot-password-page.tsx"),
    ]),
    route("/registrar", "pages/auth/register-page.tsx"),

    route("/email", "pages/redirect/email-redirect-page.tsx"),
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
        // BDSM Consent (conditional step)
        route(
          ":id/bdsm-consent",
          "pages/events/application/bdsm-consent/event-bdsm-consent-page.tsx",
        ),
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
          "/termos-e-condicoes",
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
          // Eventos (redirect)
          index("pages/admin/events-page.tsx"),
          // Ver evento
          route(
            "/:id?",
            "pages/admin/events/view-event-page/view-event-page.tsx",
          ),
          // Criar ou Editar
          route("/novo/:id?", "pages/admin/events/create-edit-event.tsx"),
          // Baixar dados
          route("/:id/baixar", "pages/admin/events/download-data.tsx"),
          // Participante vs Evento
          route(
            "/:eventId/participantes/:eventParticipantId",
            "pages/admin/events/view-event-participant/view-event-participant.tsx",
          ),
        ]),
      ]),
      ...prefix("newsletters", [
        index("pages/admin/newsletters/index.tsx"),
        route("/new", "pages/admin/newsletters/new.tsx"),
        route("/:id", "pages/admin/newsletters/view.tsx"),
        route("/:id/edit", "pages/admin/newsletters/edit.tsx"),
      ]),
    ]),
  ]),
] satisfies RouteConfig
