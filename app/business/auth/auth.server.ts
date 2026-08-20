import type { CommitResult } from "~types/forms/commit.types"
import { redirect, type Params } from "react-router"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import type { z } from "zod"
import { ENV } from "varlock/env"
import { logoutCopy } from "~/copy/auth"
import { errorsCopy } from "~/copy/errors"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import { createServerClient } from "~/lib/supabase/server"
import {
  contextSchema,
  getSupabaseSchema,
  registerUserSchema,
  userContextSchema,
} from "../common"

const {
  root: { HOME },
  auth: { LOGIN, LOGON_CALLBACK },
  dash: {
    DASHBOARD,
    account: { CHANGE_PASSWORD },
  },
} = paths

// Cache for auth context per request to avoid redundant DB queries
const authCache = new WeakMap<Request, Promise<z.infer<typeof contextSchema>>>()

export const getSupabase = async (
  request: Request,
  _params: Params,
): Promise<z.infer<typeof getSupabaseSchema>> => {
  const { supabase, headers: supabaseHeaders } = createServerClient(request)
  return { supabaseHeaders, supabase }
}

async function _fetchContext(
  request: Request,
  params: Params,
): Promise<z.infer<typeof contextSchema>> {
  const { IS_PROD_IN_DEV: isProdInDev } = ENV

  const { supabase, supabaseHeaders } = await getSupabase(request, params)
  const host = request.headers.get("host")

  const { data: authData, error: authError } = await supabase.auth.getUser()

  const errorProps = {
    supabase,
    supabaseHeaders,
    host,
    currentUser: null,
    currentProfile: null,
    isProdInDev,
  }

  if (authError) {
    // Handle errors that indicate invalid/expired tokens
    const recoverableErrorMessages = [
      "Invalid Refresh Token",
      "Refresh Token Not Found",
      "User from sub claim in JWT does not exist",
      "missing destination name oauth_client_id",
    ]

    if (
      authError.code === "refresh_token_not_found" ||
      authError.code === "user_not_found" ||
      recoverableErrorMessages.some((msg) => authError.message?.includes(msg))
    ) {
      // Clear auth session by signing out properly
      await supabase.auth.signOut()
      return errorProps
    }

    if (!authError.message.includes("Auth session missing!")) {
      logger.error("AUTH error", errorProps)
      throw await redirectWithError(DASHBOARD, errorsCopy.auth.sessionFailed)
    }
  }

  if (!authData.user) {
    return {
      ...errorProps,
      currentUser: null,
      currentProfile: null,
    }
  }

  const { id: userId, email } = authData.user
  const currentUser = { id: userId, email }

  const { data: profileData, error: profileError } = await supabase
    .rpc("get_profile_with_roles", { user_id_input: userId })
    .single()

  if (profileError) {
    if (profileError.details !== "The result contains 0 rows") {
      logger.error("getCurrentProfile", { error: profileError })
    }

    return {
      ...errorProps,
      currentUser,
      currentProfile: null,
    }
  }

  if (!profileData) {
    return {
      ...errorProps,
      currentUser,
      currentProfile: null,
    }
  }

  const currentProfile = profileData

  return {
    supabase,
    supabaseHeaders,
    currentProfile,
    currentUser,
    isProdInDev,
    host,
  }
}

export const getContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof contextSchema>> => {
  // Check cache first
  const cached = authCache.get(request)
  if (cached) {
    return cached
  }

  // Create promise and cache immediately to handle concurrent calls
  const promise = _fetchContext(request, params)
  authCache.set(request, promise)

  return promise
}

export const getUserContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof userContextSchema>> => {
  const { currentUser, ...context } = await getContext(request, params)
  if (!currentUser) {
    throw await redirectWithError(LOGIN, errorsCopy.auth.loginRequired)
  }
  return { ...context, currentUser }
}

export const getUserCodeContext = async (request: Request, params: Params) => {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  if (!code) {
    throw await redirectWithError(HOME, errorsCopy.auth.missingResetCode)
  }

  const { supabase, supabaseHeaders } = await getSupabase(request, params)

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    if (error.code === "invalid_credentials") {
      throw new Error(errorsCopy.auth.invalidCredentials)
    }
    throw new Error(errorsCopy.auth.authFailed(error.code, error.message))
  }

  return redirect(CHANGE_PASSWORD, { headers: supabaseHeaders })
}

// Not a applySchema purposefully
export const logoutUser = async (context: z.infer<typeof contextSchema>) => {
  const { supabase } = context
  const { error } = await supabase.auth.signOut()

  if (error) {
    logger.error("Logout error", { error })
    throw new Error(errorsCopy.auth.logoutFailed(error.code, error.message))
  }

  return redirectWithSuccess(HOME, logoutCopy.successToast)
}

export const registerUser = async (
  values: z.infer<typeof registerUserSchema>,
  context: z.infer<typeof contextSchema>,
): Promise<CommitResult> => {
  const { supabase, host } = context

  const { over18, confirmPassword, captchaToken, ...data } = values

  // Block signup only when a claimed profile (user_id IS NOT NULL) already exists for
  // this email. Orphan profiles (user_id = NULL, e.g. pre-imported contacts) are allowed
  // through — they will be linked to the new auth account during the agree-to-terms step.
  const normalizedEmail = data.email.toLowerCase().trim()
  const claimedProfile = await kyselyDb
    .selectFrom("profiles")
    .select("id")
    .where("email", "=", normalizedEmail)
    .where("user_id", "is not", null)
    .executeTakeFirst()

  if (claimedProfile) {
    // Mask email for PII protection in logs (show first 3 chars + domain)
    const [localPart, domain] = normalizedEmail.split("@")
    const maskedEmail = `${localPart.slice(0, 3)}***@${domain}`

    // Track blocked signup attempt for audit trail (no PII in analytics)
    trackServerEvent(
      "claimed_profile_signup_blocked",
      { profileId: claimedProfile.id },
      "/auth/register",
    )

    // Log for admin debugging with masked PII
    logger.warn("[ADMIN] Blocked claimed profile signup:", {
      maskedEmail,
      profileId: claimedProfile.id,
    })

    // Note: this message differs from the "User already registered" path below,
    // which could theoretically allow email enumeration. Accepted as a UX tradeoff —
    // users with a claimed profile cannot use password reset without contacting support.
    return {
      ok: false,
      errors: [{ questionId: "email", message: errorsCopy.auth.signupBlocked }],
    }
  }

  const origin =
    host?.startsWith("http://") || host?.startsWith("https://")
      ? host
      : `${host?.includes("localhost") ? "http://" : "https://"}${host}`

  const { error } = await supabase.auth.signUp({
    ...data,
    options: {
      captchaToken,
      emailRedirectTo: `${origin}${LOGON_CALLBACK}`,
    },
  })

  if (error) {
    // Reporting success here is the point: an address that already has an
    // account gets a password reset and the same confirmation screen as a new
    // one, so the form cannot be used to find out who is registered.
    if (error.message === "User already registered") {
      const resetError = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${origin}${LOGON_CALLBACK}`,
      })

      if (resetError.error) return { ok: false, errors: [] }

      return { ok: true }
    }

    // No question is to blame, so the runtime says the save failed and the
    // person keeps everything they typed.
    return { ok: false, errors: [] }
  }

  trackServerEvent("user_signup_completed", {}, "/auth/register")

  return { ok: true }
}
