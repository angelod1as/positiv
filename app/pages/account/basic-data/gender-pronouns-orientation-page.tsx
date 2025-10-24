import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, useSubmit } from "react-router"
import { z } from "zod"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { ExtraBasicDataSchema } from "~/business/common"
import { extraBasicData } from "~/business/participant/basic-data.server"
import { CheckboxWithOther } from "~/components/forms/base/checkbox-with-other"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import {
  GENDERS,
  ORIENTATIONS,
  PRONOUNS,
  RACE_COLOR,
} from "~/lib/constants/constants"
import type { Route } from "./+types/basic-data-page"

const toOptions = (labels: readonly string[]) =>
  labels.map((label) => ({ label, value: label }))

type FormData = z.infer<typeof ExtraBasicDataSchema>

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getContext(request, params)
  const formData = await request.formData()

  const parsedData: FormData = {
    gender: formData.get("gender")?.toString().split(",") || [],
    orientation: formData.get("orientation")?.toString().split(",") || [],
    pronouns: formData.get("pronouns")?.toString().split(",") || [],
    race_color: formData.get("race_color")?.toString().split(",") || [],
  }

  return await extraBasicData({
    formData: parsedData,
    context,
  })
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile: profile } = await getUserContext(request, params)
  return { profile }
}

const otherFilter = (item: string) => item !== "other"

const GenderPronounOrientationPage = ({ loaderData }: Route.ComponentProps) => {
  const submit = useSubmit()
  const { profile } = loaderData || {}

  const {
    control,
    handleSubmit,
    formState: { errors },
    clearErrors,
  } = useForm({
    defaultValues: {
      gender: profile?.gender || [],
      orientation: profile?.orientation || [],
      pronouns: profile?.pronouns || [],
      race_color: profile?.race_color || [],
    },
    reValidateMode: "onSubmit",
    resolver: zodResolver(ExtraBasicDataSchema),
    shouldFocusError: true,
  })

  const onSubmit = async (val: FormData) => {
    const cleaned: FormData = {
      gender: val.gender.filter(otherFilter),
      orientation: val.orientation.filter(otherFilter),
      pronouns: val.pronouns.filter(otherFilter),
      race_color: val.race_color.filter(otherFilter),
    }
    await submit(cleaned, {
      method: "POST",
    })
  }

  const handleChange = () => {
    clearErrors()
  }

  return (
    <>
      <div>
        <h1>Dados básicos</h1>
        <p className="text-muted-foreground">
          {profile?.basic_data_filled
            ? "Atualize seus dados"
            : "Precisamos destes dados básicos para nosso controle interno de pessoas participantes"}
        </p>
      </div>
      <Form
        onChange={handleChange}
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
      >
        <div className="flex flex-col gap-6 sm:grid grid-cols-12 sm:gap-4">
          <div className="flex flex-col col-span-6 gap-4">
            <Label className="text-muted-foreground">Gênero</Label>
            <CheckboxWithOther
              control={control}
              errors={errors}
              name="gender"
              options={toOptions(GENDERS)}
            />
          </div>
          <div className="flex flex-col col-span-6 gap-4">
            <Label className="text-muted-foreground">Orientação</Label>
            <CheckboxWithOther
              control={control}
              errors={errors}
              name="orientation"
              options={toOptions(ORIENTATIONS)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-6 sm:grid grid-cols-12 sm:gap-4">
          <div className="flex flex-col col-span-6 gap-4">
            <Label className="text-muted-foreground">Pronomes</Label>
            <CheckboxWithOther
              control={control}
              errors={errors}
              name="pronouns"
              options={toOptions(PRONOUNS)}
            />
          </div>
          <div className="flex flex-col col-span-6 gap-4">
            <Label className="text-muted-foreground">Cor ou Raça</Label>
            <CheckboxWithOther
              control={control}
              errors={errors}
              name="race_color"
              options={toOptions(RACE_COLOR)}
            />
          </div>
        </div>
        <Button type="submit" className="mt-4">
          Continuar
        </Button>
        <p className="text-sm text-muted-foreground">
          Não utilizamos a informação de cor ou raça como parâmetro de seleção,
          apenas para dados demográficos.
        </p>
      </Form>
    </>
  )
}

export default GenderPronounOrientationPage
