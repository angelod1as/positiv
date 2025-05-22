import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { Form } from "react-router"
import type { z } from "zod"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { Button } from "~/components/atoms/button/button"
import { Error } from "~/components/forms/error"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { zod } from "~/lib/helpers/zod"
import type { FCC } from "~types/utils.types"
import type { Route } from "./+types/event-rules-page"
import { MultipleSelect } from "./rules-form/multiple-select"
import { rulesFormSchema } from "./rules-form/rules-form-schema"
import { shuffleQuestions } from "./rules-form/shuffle-questions"
import { SingleSelect } from "./rules-form/single-select"
import { RulesText } from "./rules-text"

// Empty client-loader to force Client Side Rendering only
// otherwise the random form gives a hydration error
export async function clientLoader({}: Route.ClientLoaderArgs) {}

export async function action({ request, params }: Route.ActionArgs) {
  return await applyToEvent(request, params)
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

const validationSchema = zod.object(rulesFormSchema)
export type RulesFormData = z.infer<typeof validationSchema>

const EventRulesPage = ({}: Route.ComponentProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    clearErrors,
  } = useForm<RulesFormData>({
    reValidateMode: "onSubmit",
    mode: "onSubmit",
    resolver: zodResolver(validationSchema),
    shouldFocusError: true,
  })

  const shuffledQuestions = useMemo(shuffleQuestions, [])

  const onSubmit = () => {
    // setIsDialogOpen(true)
  }

  const handleChange = () => {
    clearErrors()
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <Wrapper>
      <Form
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
        <Button type="submit">Inscrever-se</Button>
      </Form>
    </Wrapper>
  )
}

export default EventRulesPage
