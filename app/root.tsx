import { useEffect, type ReactNode } from "react"

import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router"
import { toast as notify, Toaster } from "sonner"

import { getToast } from "remix-toast"
import { GlobalLoading } from "~/components/atoms/global-loading/global-loading"
import type { Route } from "./+types/root"
import "./app.css"
import { getContext } from "./business/auth/auth.server"
import { Footer } from "./components/organisms/footer/footer"
import { Header } from "./components/organisms/header/header"

// COMMENT OUT when offline
export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap",
  },
]

export async function loader({ params, request }: Route.LoaderArgs) {
  const { currentProfile, isProd } = await getContext(request, params)
  const { toast, headers } = await getToast(request)

  return data({ profile: currentProfile, isProd, toast }, { headers })
}

export function Layout(props: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-screen flex flex-col">
        <GlobalLoading />
        {props.children}
        <ScrollRestoration />
        <Scripts />
        <Toaster />
      </body>
    </html>
  )
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { profile, toast } = loaderData

  useEffect(() => {
    if (toast?.type) {
      notify(toast.message, {
        ...toast,
        closeButton:
          toast.closeButton ?? (toast.duration ? toast.duration > 5000 : false),
      })
    }
  }, [toast])

  return (
    <>
      <Header profile={profile} />
      <div className="flex flex-col grow mt-16">
        <Outlet />
      </div>
      <Footer />
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!"
  let details = "An unexpected error occurred."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
