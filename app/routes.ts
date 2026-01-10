import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes"

export default [
  // API ROUTES (internal endpoints)
  route("/api/process-campaigns", "routes/api.process-campaigns.ts"),

  // PUBLIC
  index("pages/homepage/homepage.tsx"),
  route("/auth/confirm", "pages/auth/confirm.tsx"),
  route("/newsletter/unsubscribe", "pages/newsletter/unsubscribe.tsx"),
  layout("pages/public/layout.tsx", [
    route("/codigo-de-conduta", "pages/public/code-of-conduct.tsx"),
  ]),

  layout("pages/auth/layout.tsx", [
    ...prefix("/entrar", [
      index("pages/auth/login-page.tsx"),
      route("/esqueci", "pages/auth/forgot-password-page.tsx"),
    ]),
    ...prefix("/registrar", [
      index("pages/auth/register-page.tsx"),
      route("/confirmar-email", "pages/auth/confirm-email-message-page.tsx"),
      route("/erro", "pages/auth/registration-error-page.tsx"),
    ]),

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
            "/:eventId/participantes/:profileId",
            "pages/admin/events/view-event-participant/view-event-participant.tsx",
          ),
        ]),
      ]),
    ]),
  ]),
] satisfies RouteConfig
