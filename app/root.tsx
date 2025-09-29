import { inputFromForm } from "composable-functions"
import { useEffect, type ReactNode } from "react"
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router"
import {
  getToast,
  redirectWithError,
  redirectWithSuccess,
} from "remix-toast"
import { toast as notify, Toaster } from "sonner"
import { GlobalLoading } from "~/components/atoms/global-loading/global-loading"
import { POSITIV_EMAIL } from "~/lib/constants/constants"
import type { Route } from "./+types/root"
import "./app.css"
import { getContext } from "./business/auth/auth.server"
import { subscribeProfileToNewsletter } from "./business/newsletter/auto-subscribe.server"
import { getSubscriptionStatus } from "./business/newsletter/subscription-helpers.server"
import {
  newsCookie,
  newsletterPreferenceCookie,
} from "./business/session.server"
import { Link } from "./components/atoms/link/link"
import { Footer } from "./components/organisms/footer/footer"
import { Header } from "./components/organisms/header/header"
import { NEWS_VERSION } from "./components/organisms/news-dialog/news-utils"
import { NewsletterSubscriptionModal } from "./components/organisms/newsletter-subscription-modal"
import { ProfileUpdateGuard } from "./components/organisms/profile-update-guard/profile-update-guard"

import "@fontsource/dm-sans/400.css"
import "@fontsource/dm-sans/400-italic.css"
import "@fontsource/dm-sans/500.css"
import "@fontsource/dm-sans/500-italic.css"
import "@fontsource/dm-sans/700.css"
import "@fontsource/dm-sans/700-italic.css"
import "@fontsource/nunito/400.css"
import "@fontsource/nunito/400-italic.css"
import "@fontsource/nunito/500.css"
import "@fontsource/nunito/500-italic.css"
import "@fontsource/nunito/700.css"
import "@fontsource/nunito/700-italic.css"

export const links: Route.LinksFunction = () => []

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
    const { currentProfile, currentUser, isProdInDev } = await getContext(
      request,
      params,
    )
    const { toast, headers } = await getToast(request)

    const cookieHeader = request.headers.get("Cookie")
    const cookie = (await newsCookie.parse(cookieHeader)) || {}

    const { showNews, newsVersion: oldNewsVersion } = cookie
    const shouldShowNews =
      Number(oldNewsVersion) < Number(NEWS_VERSION) || showNews !== "false"

    const needsProfileUpdate = currentProfile
      ? !currentProfile.race_color || currentProfile.race_color.length === 0
      : false

    let shouldShowNewsletterModal = false
    if (currentProfile) {
      const newsletterCookie =
        (await newsletterPreferenceCookie.parse(cookieHeader)) || {}

      if (newsletterCookie.checked === true) {
        shouldShowNewsletterModal = newsletterCookie.shouldShow === true
      } else {
        const subscriptionResult = await getSubscriptionStatus(
          currentProfile.id,
        )
        const subscription = subscriptionResult.success
          ? subscriptionResult.data
          : null
        const isNotSubscribed = !subscription || !subscription.consent_given
        shouldShowNewsletterModal = isNotSubscribed

        headers.append(
          "Set-Cookie",
          await newsletterPreferenceCookie.serialize({
            checked: true,
            shouldShow: isNotSubscribed,
          }),
        )
      }
    }

    return data(
      {
        currentUser,
        currentProfile,
        toast,
        isProdInDev,
        isThereAnyNews: shouldShowNews,
        needsProfileUpdate,
        shouldShowNewsletterModal,
      },
      { headers },
    )
  } catch (error) {
    console.error("Root loader error", error)
    return {
      currentUser: null,
      currentProfile: null,
      toast: null,
      isProdInDev: null,
      isThereAnyNews: null,
      needsProfileUpdate: false,
      shouldShowNewsletterModal: false,
    }
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const cookieHeader = request.headers.get("Cookie")
  const cookie = (await newsCookie.parse(cookieHeader)) || {}
  const formData = await inputFromForm(request)
  const { intent, thisUrl, newsVersion: submittedNewsVersion } = formData

  if (intent === "newsletter-subscribe") {
    const { currentProfile } = await getContext(request, params)

    if (!currentProfile) {
      return redirectWithError(
        thisUrl as string,
        "Você precisa estar logado para se inscrever",
      )
    }

    const result = await subscribeProfileToNewsletter(
      currentProfile.id,
      "manual_button",
    )

    if (!result.success) {
      return redirectWithError(
        thisUrl as string,
        "Não foi possível concluir a inscrição. Tente novamente.",
      )
    }

    const headers = new Headers()
    headers.append(
      "Set-Cookie",
      await newsletterPreferenceCookie.serialize({
        checked: true,
        shouldShow: false,
      }),
    )

    const successMessage =
      result.data?.syncStatus === "failed"
        ? "Inscrição realizada! Houve um problema temporário com o sistema de emails, mas entraremos em contato em breve."
        : "Inscrição realizada com sucesso!"

    return redirectWithSuccess(
      thisUrl as string,
      successMessage,
      { headers },
    )
  }

  if (
    cookie.showNews === "false" &&
    cookie.newsVersion === submittedNewsVersion
  ) {
    return
  }

  if (intent === "news-update" && thisUrl) {
    if (submittedNewsVersion) {
      cookie.showNews = "false"
      cookie.newsVersion = submittedNewsVersion
    }

    return redirect(thisUrl as string, {
      headers: {
        "Set-Cookie": await newsCookie.serialize(cookie),
      },
    })
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
      </body>
    </html>
  )
}

export default function App({ loaderData }: Route.ComponentProps) {
  const {
    currentUser,
    currentProfile,
    toast,
    isProdInDev,
    isThereAnyNews = false,
    needsProfileUpdate = false,
    shouldShowNewsletterModal = false,
  } = loaderData

  const location = useLocation()

  useEffect(() => {
    if (toast?.type) {
      notify(toast.message, {
        ...toast,
        closeButton:
          toast.closeButton ?? (toast.duration ? toast.duration > 5000 : false),
      })
    }
  }, [toast])

  const authFlowPaths = [
    "/entrar",
    "/registrar",
    "/conta/dados-basicos",
    "/conta/dados-basicos-cont",
    "/conta/termos-e-condicoes",
  ]
  const isAuthFlow = authFlowPaths.some((path) =>
    location.pathname.startsWith(path),
  )
  const showNewsletterModal = shouldShowNewsletterModal && !isAuthFlow

  return (
    <>
      <Header
        isProdInDev={Boolean(isProdInDev)}
        profile={currentProfile}
        userEmail={currentUser?.email}
        isThereAnyNews={isThereAnyNews ?? false}
      />
      <ProfileUpdateGuard
        currentProfile={currentProfile}
        currentPath={location.pathname}
        needsProfileUpdate={needsProfileUpdate}
      />
      <NewsletterSubscriptionModal open={showNewsletterModal} />
      <div className="flex flex-col grow mt-16">
        <Outlet />
      </div>
      <Footer
        isThereAnyNews={isThereAnyNews ?? false}
        currentProfile={currentProfile}
      />
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
      ) : error.statusText ? (
        <p>{error.statusText}</p>
      ) : (
        details
      )
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = <p>{error.message}</p>
    stack = error.stack
  }

  return (
    <div className="flex flex-col grow mt-16">
      <Header profile={null} isThereAnyNews={false} />
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
      <Footer isThereAnyNews={false} currentProfile={null} />
    </div>
  )
}
