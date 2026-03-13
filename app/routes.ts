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
  route("/api/retry-newsletter-syncs", "routes/api.retry-newsletter-syncs.ts"),
  route(
    "/api/process-pre-opening-reminders",
    "routes/api.process-pre-opening-reminders.ts",
  ),
  route(
    "/api/admin/send-registration-limit-email",
    "pages/api/admin/send-registration-limit-email.ts",
  ),
  route("/api/webhooks/asaas", "routes/api.asaas-webhook.ts"),
  route("/robots.txt", "routes/robots[.txt].ts"),
  route("/sitemap.xml", "routes/sitemap[.xml].ts"),

  // PUBLIC
  index("pages/homepage/homepage.tsx"),
  route("/auth/confirm", "pages/auth/confirm.tsx"),
  route("/newsletter/unsubscribe", "pages/newsletter/unsubscribe.tsx"),
  route("/payment/:token", "pages/payment/payment.tsx"),
  layout("pages/public/layout.tsx", [
    route("/codigo-de-conduta", "pages/public/code-of-conduct.tsx"),
  ]),

  layout("pages/auth/layout.tsx", [
    route("/feedback", "pages/public/feedback-page.tsx"),
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
        index("pages/admin/dashboard/dashboard-page.tsx"),
        // Global participants listing
        route(
          "participantes",
          "pages/admin/participants/participants-page.tsx",
        ),
        // View single participant (profile-only mode)
        route(
          "participantes/:profileId",
          "pages/admin/participants/view-profile-page.tsx",
        ),
        // Feedbacks
        route("feedbacks", "pages/admin/feedbacks/feedbacks-page.tsx"),
        // Dataviz
        route("numeros", "pages/admin/dataviz/dataviz-page.tsx"),
      ]),
      ...prefix("eventos", [
        layout("pages/admin/events/layout.tsx", [
          // Eventos (redirect)
          index("pages/admin/events/events-page.tsx"),
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
