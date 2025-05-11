import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, type Dispatch, type FC, type SetStateAction } from "react"
import { useForm } from "react-hook-form"
import { Form } from "react-router"
import type { z } from "zod"
import { Button } from "~/components/atoms/button/button"
import { zod } from "~/lib/helpers/zod"
import { MultipleSelect } from "./multiple-select"
import { rulesFormSchema } from "./rules-form-schema"
import { shuffleQuestions } from "./shuffle-questions"
import { SingleSelect } from "./single-select"

const validationSchema = zod.object(rulesFormSchema)
export type RulesFormData = z.infer<typeof validationSchema>

type RulesFormProps = { setIsDialogOpen: Dispatch<SetStateAction<boolean>> }
export const RulesForm: FC<RulesFormProps> = ({ setIsDialogOpen }) => {
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
    setIsDialogOpen(true)
  }

  const handleChange = () => {
    clearErrors()
  }

  return (
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

      <Button type="submit">Inscrever-se</Button>
    </Form>
  )
}
