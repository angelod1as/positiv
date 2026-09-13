import type { ActionFunctionArgs } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { savePaymentCpf } from "~/business/payment/payment-cpf.server"
import { errorsCopy } from "~/copy/errors"
import { paymentsCopy } from "~/copy/payments"

/**
 * A route of its own rather than the page's action: the page's action creates
 * the Asaas charge and answers with a redirect out of the app, which is not
 * what saving a CPF should do.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { currentProfile } = await getUserContext(request, params)

  if (!currentProfile) {
    return Response.json(
      { ok: false, error: errorsCopy.auth.loginRequired },
      { status: 403 },
    )
  }

  const formData = await request.formData()
  const result = await savePaymentCpf({
    profileId: currentProfile.id,
    cpf: String(formData.get("cpf") ?? ""),
  })

  if (!result.success) {
    return Response.json(
      {
        ok: false,
        error: result.errors[0]?.message ?? paymentsCopy.errors.invalidCpf,
      },
      { status: 422 },
    )
  }

  return Response.json({ ok: true })
}
