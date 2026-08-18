import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { TextArea } from "~/components/ui/textarea"
import { Radio } from "~/components/forms/base/radio"
import { Select } from "~/components/forms/base/select"
import type { RenderQuestion } from "./presentations/presentation.types"

const asText = (value: unknown) => (typeof value === "string" ? value : "")

const asList = (value: unknown) =>
  Array.isArray(value) ? (value as string[]) : []

const choiceClassName = "flex items-start gap-2 cursor-pointer mb-0"

export const renderQuestion: RenderQuestion = ({
  question,
  value,
  onChange,
  labelledBy,
}) => {
  const { input } = question
  const shared = { id: question.id, "aria-labelledby": labelledBy }

  switch (input.kind) {
    case "text":
      return (
        <Input
          {...shared}
          type="text"
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "email":
      return (
        <Input
          {...shared}
          type="email"
          autoComplete="email"
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "password":
      return (
        <Input
          {...shared}
          type="password"
          autoComplete={input.autoComplete}
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "textnumber":
      return (
        <Input
          {...shared}
          type="number"
          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "date":
      return (
        <Input
          {...shared}
          type="date"
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "textarea":
      return (
        <TextArea
          {...shared}
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "select":
      return (
        <Select
          {...shared}
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecione</option>
          {input.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )

    case "radio":
      return (
        <div
          role="radiogroup"
          aria-labelledby={labelledBy}
          className="flex flex-col gap-3"
        >
          {input.options.map((option) => (
            <Label key={option.value} className={choiceClassName}>
              <Radio
                name={question.id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
            </Label>
          ))}
        </div>
      )

    case "checkbox": {
      const selected = asList(value)

      return (
        <div
          role="group"
          aria-labelledby={labelledBy}
          className="flex flex-col gap-3"
        >
          {input.options.map((option) => {
            const checked = selected.includes(option.value)

            return (
              <Label key={option.value} className={choiceClassName}>
                <Checkbox
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value],
                    )
                  }
                />
                <span>{option.label}</span>
              </Label>
            )
          })}
        </div>
      )
    }
  }
}
