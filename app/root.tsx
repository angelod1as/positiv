import { inputFromForm } from "composable-functions"
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react"
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
import { getToast, redirectWithError, redirectWithSuccess } from "remix-toast"
import { toast as notify, Toaster } from "sonner"
import { ENV } from "varlock/env"
import { isValidCpf } from "~/lib/helpers/cpf"
import { isValidPhone } from "~/lib/helpers/phone"
import { useMarkHydrated } from "~/lib/hooks/use-mark-hydrated"
import { Copy } from "~/components/atoms/copy/copy"
import { GlobalLoading } from "~/components/atoms/global-loading/global-loading"
import { TooltipProvider } from "~/components/ui/tooltip"
import { errorsCopy } from "~/copy/errors"
import { metaCopy } from "~/copy/meta"
import { newsletterSubscribeCopy } from "~/copy/newsletter"
import { POSITIV_EMAIL } from "~/lib/constants/constants"
import type { Route } from "./+types/root"
import "./app.css"
import { getContext } from "./business/auth/auth.server"
import { isDraftModeEnabled } from "./business/cms/draft-mode.server"
import {
  type DraftSnapshotQuery,
  loadDraftSnapshotQuery,
} from "./business/cms/live-loader.server"
import {
  draftSettingsSchema,
  resolveSiteSettings,
} from "./business/cms/resolve-snapshot"
import type { SiteSettings } from "./business/cms/site-settings.schema"
import {
  type LoadedSiteSettings,
  loadSiteSettings,
} from "./business/cms/site-settings.server"
import { subscribeProfileToNewsletter } from "./business/newsletter/auto-subscribe.server"
import { getSubscriptionStatus } from "./business/newsletter/subscription-helpers.server"
import {
  newsCookie,
  newsletterPreferenceCookie,
} from "./business/session.server"
import { Footer } from "./components/organisms/footer/footer"
import { Header } from "./components/organisms/header/header"
import { NEWS_VERSION } from "./components/organisms/news-dialog/news-utils"
import { NewsletterSubscriptionModal } from "./components/organisms/newsletter-subscription-modal"
import { ProfileUpdateGuard } from "./components/organisms/profile-update-guard/profile-update-guard"
import type { ProfileWithRoles } from "~types/database/entities.types"

import "@fontsource/dm-sans/400-italic.css"
import "@fontsource/dm-sans/400.css"
import "@fontsource/dm-sans/500-italic.css"
import "@fontsource/dm-sans/500.css"
import "@fontsource/dm-sans/700-italic.css"
import "@fontsource/dm-sans/700.css"
import "@fontsource/nunito/latin-400-italic.css"
import "@fontsource/nunito/latin-ext-400-italic.css"
import "@fontsource/nunito/latin-400.css"
import "@fontsource/nunito/latin-ext-400.css"
import "@fontsource/nunito/latin-500-italic.css"
import "@fontsource/nunito/latin-ext-500-italic.css"
import "@fontsource/nunito/latin-500.css"
import "@fontsource/nunito/latin-ext-500.css"
import "@fontsource/nunito/latin-700-italic.css"
import "@fontsource/nunito/latin-ext-700-italic.css"
import "@fontsource/nunito/latin-700.css"
import "@fontsource/nunito/latin-ext-700.css"

// Lazy so the live-mode runtime and its deps never reach a visitor's bundle.
const VisualEditing = lazy(() =>
  import("./components/pages/root/visual-editing").then((module) => ({
    default: module.VisualEditing,
  })),
)

const LiveAppShell = lazy(() =>
  import("./components/pages/root/live-app-shell").then((module) => ({
    default: module.LiveAppShell,
  })),
)

export const links: Route.LinksFunction = () => []

export function meta({}: Route.MetaArgs) {
  return [
    { title: metaCopy.root.title },
    { property: "og:title", content: metaCopy.root.title },
    {
      name: "description",
      content: metaCopy.root.description,
    },
    {
      property: "og:description",
      content: metaCopy.root.description,
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

function siteSettingsFromDraft(data: unknown): LoadedSiteSettings {
  try {
    const { siteSettings } = draftSettingsSchema.parse(data)
    return {
      siteSettings: resolveSiteSettings(siteSettings),
      editorialSystemUnavailable: false,
    }
  } catch (error) {
    console.error("Could not resolve the draft Site Settings", error)
    return { siteSettings: null, editorialSystemUnavailable: true }
  }
}

function liveSnapshotFrom(draft: DraftSnapshotQuery | null) {
  if (!draft) return undefined
  return {
    initial: draft.initial,
    query: draft.query,
    params: draft.params,
    clientConfig: draft.clientConfig,
  }
}

function siteSettingsFor(
  draft: DraftSnapshotQuery | null,
): Promise<LoadedSiteSettings> | LoadedSiteSettings {
  // A null draft means the published path, or a draft read that failed and
  // degrades to the published, cached snapshot.
  return draft ? siteSettingsFromDraft(draft.initial.data) : loadSiteSettings()
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const draftMode = await isDraftModeEnabled(request)
  // Start the draft read alongside the session so the two run in parallel. A
  // failed draft fetch degrades to the published snapshot rather than taking
  // the whole response down.
  const draftQuery: Promise<DraftSnapshotQuery | null> = draftMode
    ? loadDraftSnapshotQuery(request).catch((error) => {
        console.error("Could not load the draft snapshot", error)
        return null
      })
    : Promise.resolve(null)

  try {
    const [{ currentProfile, currentUser, isProdInDev, supabaseHeaders }, draft] =
      await Promise.all([getContext(request, params), draftQuery])
    const liveSnapshot = liveSnapshotFrom(draft)
    const siteSettings = siteSettingsFor(draft)
    const { toast, headers } = await getToast(request)

    supabaseHeaders.forEach((value, key) => {
      headers.append(key, value)
    })

    const cookieHeader = request.headers.get("Cookie")
    const cookie = (await newsCookie.parse(cookieHeader)) || {}

    const { showNews, newsVersion: oldNewsVersion } = cookie
    const shouldShowNews =
      Number(oldNewsVersion) < Number(NEWS_VERSION) || showNews !== "false"

    const needsProfileUpdate = currentProfile
      ? !currentProfile.race_color ||
        currentProfile.race_color.length === 0 ||
        !isValidCpf(currentProfile.cpf) ||
        !isValidPhone(
          currentProfile.phone,
          currentProfile.phone_is_international ?? false,
        )
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
        draftMode,
        liveSnapshot,
        ...(await siteSettings),
      },
      { headers },
    )
  } catch (error) {
    console.error("Root loader error", error)
    const draft = await draftQuery
    return {
      currentUser: null,
      currentProfile: null,
      toast: null,
      isProdInDev: null,
      isThereAnyNews: null,
      needsProfileUpdate: false,
      shouldShowNewsletterModal: false,
      draftMode,
      liveSnapshot: liveSnapshotFrom(draft),
      ...(await siteSettingsFor(draft)),
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
        newsletterSubscribeCopy.loginRequired,
      )
    }

    const result = await subscribeProfileToNewsletter(
      currentProfile.id,
      "manual_button",
    )

    if (!result.success) {
      return redirectWithError(thisUrl as string, newsletterSubscribeCopy.failed)
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
        ? newsletterSubscribeCopy.successWithSyncFailure
        : newsletterSubscribeCopy.success

    return redirectWithSuccess(thisUrl as string, successMessage, { headers })
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
    <html lang="pt-BR" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="only light" />
        <Meta />
        <Links />
        {ENV.VITE_UMAMI_WEBSITE_ID && ENV.VITE_UMAMI_URL && (
          <script
            defer
            src={`${ENV.VITE_UMAMI_URL}/script.js`}
            data-website-id={ENV.VITE_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body className="h-screen flex flex-col">
        <TooltipProvider delayDuration={0}>
          <Toaster richColors position="top-center" />
          <GlobalLoading />
          {props.children}
          <ScrollRestoration />
          <Scripts />
        </TooltipProvider>
      </body>
    </html>
  )
}

type AppShellProps = {
  profile: ProfileWithRoles | null
  userEmail?: string
  isProdInDev: boolean | null | undefined
  isThereAnyNews: boolean
  needsProfileUpdate: boolean
  currentPath: string
  showNewsletterModal: boolean
  siteSettings: SiteSettings | null
  editorialSystemUnavailable: boolean
}

// Effect-free chrome, so re-rendering it as live edits arrive is side-effect
// free. Fed the loader value for visitors or the live value in draft mode.
function AppShell({
  profile,
  userEmail,
  isProdInDev,
  isThereAnyNews,
  needsProfileUpdate,
  currentPath,
  showNewsletterModal,
  siteSettings,
  editorialSystemUnavailable,
}: AppShellProps) {
  return (
    <>
      <Header
        isProdInDev={Boolean(isProdInDev)}
        profile={profile}
        userEmail={userEmail}
        isThereAnyNews={isThereAnyNews}
        navigation={siteSettings?.navigation}
        notice={siteSettings?.notice}
        editorialSystemUnavailable={editorialSystemUnavailable}
      />
      <ProfileUpdateGuard
        currentProfile={profile}
        currentPath={currentPath}
        needsProfileUpdate={needsProfileUpdate}
      />
      <NewsletterSubscriptionModal open={showNewsletterModal} />
      <div className="flex flex-col grow mt-[var(--site-header-height,4rem)]">
        <Outlet />
      </div>
      <Footer
        isThereAnyNews={isThereAnyNews}
        currentProfile={profile}
        siteSettings={siteSettings}
      />
    </>
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
    siteSettings,
    editorialSystemUnavailable = false,
    draftMode = false,
    liveSnapshot,
  } = loaderData

  const location = useLocation()

  useMarkHydrated()

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
    "/conta/termos-e-condicoes",
  ]
  const isAuthFlow = authFlowPaths.some((path) =>
    location.pathname.startsWith(path),
  )
  const showNewsletterModal = shouldShowNewsletterModal && !isAuthFlow

  // Live Site Settings swap in place; the shell stays put so loading the live
  // chunk never remounts it. undefined means no live value has arrived yet.
  const [liveSiteSettings, setLiveSiteSettings] = useState<
    SiteSettings | null | undefined
  >(undefined)
  const activeSiteSettings =
    liveSiteSettings === undefined ? siteSettings : liveSiteSettings

  return (
    <>
      <AppShell
        profile={currentProfile}
        userEmail={currentUser?.email ?? undefined}
        isProdInDev={isProdInDev}
        isThereAnyNews={isThereAnyNews ?? false}
        needsProfileUpdate={needsProfileUpdate}
        currentPath={location.pathname}
        showNewsletterModal={showNewsletterModal}
        siteSettings={activeSiteSettings}
        editorialSystemUnavailable={editorialSystemUnavailable}
      />
      {draftMode && liveSnapshot && (
        <Suspense fallback={null}>
          <LiveAppShell
            snapshot={liveSnapshot}
            onSiteSettings={setLiveSiteSettings}
          />
          <VisualEditing clientConfig={liveSnapshot.clientConfig} />
        </Suspense>
      )}
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  console.error("ERROR BOUNDARY", error)
  let message: string = errorsCopy.boundary.title
  let details = <Copy>{errorsCopy.boundary.details(POSITIV_EMAIL)}</Copy>
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message =
      error.status === 404
        ? errorsCopy.boundary.notFoundTitle
        : errorsCopy.boundary.genericTitle
    details =
      error.status === 404 ? (
        <p>{errorsCopy.boundary.notFound}</p>
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
    <div className="flex flex-col grow mt-[var(--site-header-height,4rem)]">
      <Header profile={null} isThereAnyNews={false} />
      <main className="grow flex flex-col justify-center items-center">
        <div className="max-w-2xl">
          <h1>{message}</h1>
          <div className="[&_ul]:list-disc">{details}</div>
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
