import { SpeedInsights } from "@vercel/speed-insights/react"
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
import { Link } from "./components/atoms/link/link"
import { Footer } from "./components/organisms/footer/footer"
import { Header } from "./components/organisms/header/header"
import { POSITIV_EMAIL } from "./lib/helpers/constants"

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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Positiv Party" },
    { property: "og:title", content: "Positiv Party" },
    {
      name: "description",
      content:
        "Eventos para amantes de saliências não-mono, curioses com o mundo da suruba, e quem quer explorar a própria sexualidade",
    },
    {
      property: "og:description",
      content:
        "Eventos para amantes de saliências não-mono, curioses com o mundo da suruba, e quem quer explorar a própria sexualidade",
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: "/apple-touch-icon.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "/favicon-16x16.png",
    },
    {
      rel: "manifest",
      sizes: "180x180",
      href: "/site.webmanifest",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://www.positivparty.com/" },
    {
      property: "og:image",
      content: "https://www.positivparty.com/social.jpg",
    },
  ]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  try {
    const { currentProfile, isProd, currentUser } = await getContext(
      request,
      params,
    )
    const { toast, headers } = await getToast(request)

    return data({ currentUser, currentProfile, isProd, toast }, { headers })
  } catch (error) {
    console.error(error)
    return { currentUser: null, currentProfile: null, toast: null }
  }
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
        <Toaster richColors position="top-center" />
        <GlobalLoading />
        {props.children}
        <ScrollRestoration />
        <Scripts />
        <SpeedInsights />
      </body>
    </html>
  )
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { currentUser, currentProfile, toast } = loaderData

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
      <Header profile={currentProfile} userEmail={currentUser?.email} />
      <div className="flex flex-col grow mt-16">
        <Outlet />
      </div>
      <Footer />
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  console.error("ERROR BOUNDARY", error)
  let message = "Oops!"
  let details = (
    <>
      <p>Um erro ocorreu. Isso é frustrante, nós sabemos.</p>
      <p>
        Avise-nos pelo <Link to={`mailto:${POSITIV_EMAIL}`}>email</Link> com as
        informações:
      </p>
      <ul className="list-disc">
        <li>Navegador (Chrome, Firefox, Safari, etc)</li>
        <li>Sistema operacional (iOS, Android, macOS, Windows)</li>
        <li>
          Um breve relato do que você tentou fazer (qual página, qual botão,
          etc)
        </li>
      </ul>
    </>
  )
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404 ? (
        <p>Página não encontrada.</p>
      ) : (
        <p>{error.statusText || details}</p>
      )
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = <p>{error.message}</p>
    stack = error.stack
  }

  return (
    <div className="flex flex-col grow mt-16">
      <Header profile={null} />
      <main className="grow flex flex-col justify-center items-center">
        <div className="max-w-2xl">
          <h1>{message}</h1>
          <div>{details}</div>
          {stack && (
            <pre className="w-full p-4 overflow-x-auto">
              <code>{stack}</code>
            </pre>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
