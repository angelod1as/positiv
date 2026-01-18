import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { Form, redirect, useLoaderData, useSubmit } from "react-router"
import { redirectWithError } from "remix-toast"
import type { z } from "zod"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import { getUserContext } from "~/business/auth/auth.server"
import { rulesSessionStorage } from "~/business/session.server"
import { Button } from "~/components/atoms/button/button"
import { Error } from "~/components/forms/base/error"
import { MultipleSelect } from "~/components/forms/custom/rules/multiple-select"
import { getRulesFormSchema } from "~/components/forms/custom/rules/rules-form-schema"
import { shuffleQuestions } from "~/components/forms/custom/rules/shuffle-questions"
import { SingleSelect } from "~/components/forms/custom/rules/single-select"
import { RulesText } from "~/components/pages/events/rules/rules-text"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"
import paths from "~/lib/paths"
import type { FCC } from "~types/utils/utils.types"
import type { Route } from "./+types/event-rules-page"

const {
  dash: {
    DASHBOARD,
    events: { EVENT_DATA, EVENT_RULES },
  },
} = paths

// This clientLoader is needed, otherwise the random form loads with Hydration Error
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return await serverLoader()
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) return redirect(DASHBOARD)

  await getUserContext(request, params)

  const event = await kyselyDb
    .selectFrom("events")
    .select("event_type")
    .where("id", "=", params.id)
    .executeTakeFirst()

  if (!event) return redirect(DASHBOARD)

  return { eventType: event.event_type }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { commitSession, getSession } = rulesSessionStorage
  try {
    const session = await getSession(request.headers.get("Cookie"))
    session.set("rulesCorrect", true)

    trackServerEvent("rules_quiz_passed", { eventId: params.id }, `/events/${params.id}/rules`)

    return redirect(EVENT_DATA(params.id), {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    })
  } catch (error) {
    console.error("event-page-rules action", error)
    return redirectWithError(
      EVENT_RULES(params.id),
      "Houve um erro no sistema, tente novamente mais tarde",
    )
  }
}

const Wrapper: FCC = ({ children }) => (
  <>
    <RulesText />

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="mt-4">✅ Hora do teste! ✅</h2>
        </CardTitle>
        <CardDescription>
          <p>(As questões e respostas são automaticamente embaralhadas)</p>
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </>
)

export function HydrateFallback() {
  return (
    <Wrapper>
      <p>Carregando perguntas...</p>
    </Wrapper>
  )
}

const EventRulesPage = ({}: Route.ComponentProps) => {
  const submit = useSubmit()
  const { eventType } = useLoaderData<typeof loader>()

  const rulesFormSchema = useMemo(
    () => getRulesFormSchema(eventType),
    [eventType],
  )
  const validationSchema = useMemo(
    () => zod.object(rulesFormSchema),
    [rulesFormSchema],
  )

  const {
    control,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<z.infer<typeof validationSchema>>({
    reValidateMode: "onSubmit",
    mode: "onSubmit",
    resolver: zodResolver(validationSchema),
    shouldFocusError: true,
  })

  const onSubmit: SubmitHandler<z.infer<typeof validationSchema>> = (data) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => formData.append(key, String(item)))
      } else {
        formData.append(key, String(value))
      }
    })
    submit(formData, {
      method: "POST",
    })
  }

  const shuffledQuestions = useMemo(
    () => shuffleQuestions(eventType),
    [eventType],
  )

  const handleChange = () => {
    clearErrors()
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <Wrapper>
      <Form
        method="POST"
        onChange={handleChange}
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-12"
      >
        {shuffledQuestions.map(({ name, question, answers, correct }) => {
          const errorMsg = errors[name]?.message?.toString()
          return (
            <div
              key={name}
              className="font-bold text-base flex flex-col gap-4"
              data-testid="question"
            >
              <p>{question}</p>
              {correct.length === 1 ? (
                <SingleSelect
                  name={name}
                  key={name}
                  control={control}
                  answers={answers}
                  error={errorMsg}
                />
              ) : (
                <MultipleSelect
                  key={name}
                  name={name}
                  control={control}
                  answers={answers}
                  error={errorMsg}
                />
              )}
            </div>
          )
        })}

        {hasErrors && <Error>Há erros nas suas respostas</Error>}
        <Button type="submit">Continuar</Button>
      </Form>
    </Wrapper>
  )
}

export default EventRulesPage
