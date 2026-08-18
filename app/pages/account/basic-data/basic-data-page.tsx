import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { basicDataSchema } from "~/business/common"
import { basicData } from "~/business/participant/basic-data.server"
import { SchemaForm } from "~/components/forms/base/schema-form"
import { basicDataCopy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import paths from "~/lib/paths"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/basic-data-page"

const {
  dash: {
    account: { GENDER_PRONOUNS_ORIENTATION },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.basicData.title)
}

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getContext(request, params)

  return formAction({
    request,
    schema: basicDataSchema,
    mutation: basicData,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(GENDER_PRONOUNS_ORIENTATION, {
          message: basicDataCopy.successToast,
        })
      }
      return result
    },
    context,
  })
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const {
    currentProfile: profile,
    currentUser,
    supabase,
  } = await getUserContext(request, params)

  // Check for orphaned profile with user's email
  let orphanedProfile = null
  if (currentUser?.email) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", currentUser.email)
      .is("user_id", null)
      .single()

    // Only set orphanedProfile if we found one (ignore "no rows" error)
    if (data && !error) {
      orphanedProfile = data
    } else if (error && error.code !== "PGRST116") {
      // Log unexpected errors but don't fail the loader
      console.error("Error checking for orphaned profile:", error)
    }
  }

  return { profile, orphanedProfile }
}

const BasicDataPage = ({ loaderData }: Route.ComponentProps) => {
  const { profile, orphanedProfile } = loaderData || {}

  // Use orphaned profile data if available, otherwise use current profile
  const profileData = orphanedProfile || profile

  const defaultValues = {
    ...(profileData || {}),
    ...(profileData?.phone
      ? {
          confirm_phone: profileData.phone,
        }
      : {}),
  }

  return (
    <>
      <div>
        <h1>{basicDataCopy.title}</h1>
        <p className="text-muted-foreground">
          {orphanedProfile
            ? basicDataCopy.intro.orphan
            : profile?.basic_data_filled
              ? basicDataCopy.intro.update
              : basicDataCopy.intro.initial}
        </p>
      </div>
      <SchemaForm
        schema={basicDataSchema}
        values={defaultValues}
        labels={basicDataCopy.labels}
        inputTypes={{
          confirm_phone: "textnumber",
          phone: "textnumber",
          date_of_birth: "date",
        }}
        descriptions={basicDataCopy.descriptions}
      >
        {({ Field, Button, Errors }) => {
          return (
            <div>
              <div className="flex flex-col gap-6 sm:grid grid-cols-12 sm:gap-4">
                <Field name="full_name" className="col-span-5" />
                <Field name="social_name" className="col-span-4" />
                <Field name="date_of_birth" className="col-span-3" />
                <Field name="where_lives" className="col-span-6" />
                <Field name="how_came_to_us" className="col-span-6" />
                <Field name="phone" className="col-span-6" />
                <Field name="confirm_phone" className="col-span-6" />
                <p className="col-span-12 mt-4 text-muted-foreground text-sm">
                  {basicDataCopy.documentsNotice}
                </p>
                <Field name="cpf" className="col-span-4" />
                <Field name="rg" className="col-span-4" />
                <Field name="rg_issuer" className="col-span-4" />
              </div>
              <Errors />
              <Button />
            </div>
          )
        }}
      </SchemaForm>
    </>
  )
}

export default BasicDataPage
