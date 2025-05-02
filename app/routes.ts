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
    route("/sair", "pages/auth/logout-page.tsx"),
  ]),

  layout("pages/dashboard/layout.tsx", [
    ...prefix("dashboard", [index("pages/dashboard/dashboard-page.tsx")]),
  ]),

  // Debug route for Chrome DevTools
  route(
    "/.well-known/appspecific/com.chrome.devtools.json",
    "pages/debug-null/debug-null.ts",
  ),
] satisfies RouteConfig
