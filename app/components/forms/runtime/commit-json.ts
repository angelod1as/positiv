import type { CommitResult } from "~types/forms/commit.types"

/**
 * The POST every form on this runtime makes, and the one thing that can come
 * back that is not a verdict.
 *
 * A session that expired mid-form is answered with a redirect, which fetch
 * follows to a page of HTML. Reading that as JSON would only say the save
 * failed, when what someone needs is to sign in again — so the caller is handed
 * the path it landed on and the run is told the save was refused.
 *
 * `Extra` is whatever the route answers with beside the verdict, such as the id
 * of an event that has just been created. It is `Partial` because the body is
 * whatever crossed the wire, not something the types were consulted about.
 */
export async function commitJson<Extra extends object = object>(
  url: string,
  body: unknown,
  onRedirect: (pathname: string) => void,
): Promise<CommitResult & Partial<Extra>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (response.redirected) {
    onRedirect(new URL(response.url).pathname)
    return { ok: false, errors: [] }
  }

  const answer: unknown = await response.json()

  // Anything can come back with a 200 and a json body — a proxy's error page,
  // a route that changed shape. Handed on unchecked, a refusal carrying no
  // errors reaches a runtime that reads them without looking, and the run stops
  // dead with nothing said. A verdict nobody can read is a save nobody can
  // confirm.
  if (!isVerdict(answer)) return { ok: false, errors: [] }

  return answer as CommitResult & Partial<Extra>
}

function isVerdict(answer: unknown): answer is CommitResult {
  if (typeof answer !== "object" || answer === null) return false

  const { ok, errors } = answer as { ok?: unknown; errors?: unknown }

  return ok === true || (ok === false && Array.isArray(errors))
}
