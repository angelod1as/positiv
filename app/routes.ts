import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes"

export default [
  index("pages/homepage/homepage.tsx"),
  layout("pages/auth/layout.tsx", [route("/entrar", "pages/auth/login.tsx")]),
] satisfies RouteConfig
