import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes"

export default [
  index("pages/homepage/homepage.tsx"),
  layout("pages/auth/layout.tsx", [
    route("/entrar", "pages/auth/login.tsx"),
    route("/registrar", "pages/auth/register.tsx"),
    route("/sair", "pages/auth/logout.tsx"),
  ]),

  // Debug route for Chrome DevTools
  route(
    "/.well-known/appspecific/com.chrome.devtools.json",
    "pages/debug-null/debug-null.tsx",
  ),
] satisfies RouteConfig
