import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { TextArea } from "~/components/ui/textarea"
import { ChipSelect } from "~/components/forms/base/chip-select"
import { Radio } from "~/components/forms/base/radio"
import { Select } from "~/components/forms/base/select"
import { formRuntimeCopy, likertCopy, monthYearCopy } from "~/copy/forms"
import { LIKERT_CHOICES, type LikertAnswer } from "./likert"
import type { MonthYearAnswer } from "./month-year"
import type { RenderQuestion } from "./presentations/presentation.types"

const asText = (value: unknown) => (typeof value === "string" ? value : "")

const asList = (value: unknown) =>
  Array.isArray(value) ? (value as string[]) : []

// The 44px row a finger needs, kept for the pointer that needs it. With a mouse
// the same row is dead space: three alternatives a thumb tall read as three
// separate questions.
const choiceClassName =
  "flex items-start gap-2 py-0.5 cursor-pointer mb-0 pointer-coarse:min-h-11 pointer-coarse:py-2"

const asLikert = (value: unknown): Partial<LikertAnswer> =>
  typeof value === "object" && value !== null
    ? (value as Partial<LikertAnswer>)
    : {}

const asMonthYear = (value: unknown): MonthYearAnswer =>
  typeof value === "object" && value !== null ? (value as MonthYearAnswer) : {}

const FIRST_YEAR = 1950

const yearsBackFromNow = () =>
  Array.from(
    { length: new Date().getFullYear() - FIRST_YEAR + 1 },
    (_, index) => new Date().getFullYear() - index,
  )

const affixClassName = "text-sm text-muted-foreground shrink-0"

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
          placeholder={input.placeholder}
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
          placeholder={input.placeholder}
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
          placeholder={input.placeholder}
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "textnumber": {
      const field = (
        <Input
          {...shared}
          type="number"
          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder={input.placeholder}
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

      if (!input.prefix && !input.suffix) return field

      return (
        <div className="flex items-center gap-2">
          {input.prefix ? (
            <span className={affixClassName}>{input.prefix}</span>
          ) : null}
          {field}
          {input.suffix ? (
            <span className={affixClassName}>{input.suffix}</span>
          ) : null}
        </div>
      )
    }

    case "date":
      return (
        <Input
          {...shared}
          type="date"
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "datetime":
      return (
        <Input
          {...shared}
          type="datetime-local"
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case "textarea":
      return (
        <TextArea
          {...shared}
          placeholder={input.placeholder}
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
          <option value="">{formRuntimeCopy.selectPlaceholder}</option>
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
          className="flex flex-col gap-0.5 pointer-coarse:gap-2"
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
          className="flex flex-col gap-0.5 pointer-coarse:gap-2"
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

    case "chips":
      return (
        <ChipSelect
          id={question.id}
          labelledBy={labelledBy}
          options={input.options}
          value={asList(value)}
          onChange={onChange}
          allowOther={input.allowOther}
          otherPlaceholder={input.otherPlaceholder}
        />
      )

    case "boolean":
      return (
        <Label className={choiceClassName}>
          <Checkbox
            id={question.id}
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{question.prompt}</span>
        </Label>
      )

    case "likert": {
      const answer = asLikert(value)
      const commentId = `${question.id}-comment`

      return (
        <div className="flex flex-col gap-4">
          <div
            role="radiogroup"
            aria-labelledby={labelledBy}
            className="flex flex-col gap-0.5 pointer-coarse:gap-2"
          >
            {LIKERT_CHOICES.map((choice) => (
              <Label key={choice} className={choiceClassName}>
                <Radio
                  name={question.id}
                  value={choice}
                  checked={answer.choice === choice}
                  onChange={() => onChange({ ...answer, choice })}
                />
                <span>{likertCopy.choices[choice]}</span>
              </Label>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={commentId} className="mb-0 text-muted-foreground">
              {likertCopy.commentLabel}
            </Label>
            <TextArea
              id={commentId}
              value={answer.comment ?? ""}
              onChange={(event) =>
                onChange({ ...answer, comment: event.target.value })
              }
            />
          </div>
        </div>
      )
    }

    case "monthyear": {
      const answer = asMonthYear(value)
      const optedOut = "none" in answer
      const parts = optedOut ? {} : answer
      const monthId = `${question.id}-month`
      const yearId = `${question.id}-year`

      const pick = (part: "month" | "year", picked: string) => {
        const { [part]: _dropped, ...rest } = parts
        onChange(picked === "" ? rest : { ...rest, [part]: Number(picked) })
      }

      return (
        <div
          role="group"
          aria-labelledby={labelledBy}
          className="flex flex-col gap-3"
        >
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor={monthId} className="mb-0 text-muted-foreground">
                {monthYearCopy.month}
              </Label>
              <Select
                id={monthId}
                disabled={optedOut}
                value={parts.month === undefined ? "" : String(parts.month)}
                onChange={(event) => pick("month", event.target.value)}
              >
                <option value="">{formRuntimeCopy.selectPlaceholder}</option>
                {monthYearCopy.months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor={yearId} className="mb-0 text-muted-foreground">
                {monthYearCopy.year}
              </Label>
              <Select
                id={yearId}
                disabled={optedOut}
                value={parts.year === undefined ? "" : String(parts.year)}
                onChange={(event) => pick("year", event.target.value)}
              >
                <option value="">{formRuntimeCopy.selectPlaceholder}</option>
                {yearsBackFromNow().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {input.optOut ? (
            <Label className={choiceClassName}>
              <Checkbox
                checked={optedOut}
                onChange={(event) =>
                  onChange(event.target.checked ? { none: true } : {})
                }
              />
              <span>{input.optOut.label}</span>
            </Label>
          ) : null}
        </div>
      )
    }
  }
}
