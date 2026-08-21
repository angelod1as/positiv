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

  return (await response.json()) as CommitResult & Partial<Extra>
}
