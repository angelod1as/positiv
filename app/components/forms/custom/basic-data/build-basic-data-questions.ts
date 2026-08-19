import { basicDataFieldsSchema, ExtraBasicDataSchema } from "~/business/common"
import type {
  Answers,
  Option,
  Question,
} from "~/components/forms/runtime/question.types"
import {
  basicDataCopy,
  basicDataValidation,
  genderPronounsOrientationCopy,
} from "~/copy/account"
import { normalizeName } from "~/lib/helpers/strings"
import {
  GENDERS,
  ORIENTATIONS,
  PRONOUNS,
  RACE_COLOR,
} from "~/lib/constants/constants"

/**
 * The label is the value: these strings are written to the profile and counted
 * by the demographics, so a separate code would only be a second name for the
 * same thing to fall out of step with.
 */
const toOptions = (labels: readonly string[]): Option[] =>
  labels.map((label) => ({ label, value: label }))

const asText = (value: unknown) => (typeof value === "string" ? value : "")

export function buildBasicDataQuestions(): Question[] {
  const { shape } = basicDataFieldsSchema
  const extra = ExtraBasicDataSchema.shape
  const { labels, descriptions } = basicDataCopy

  return [
    {
      id: "full_name",
      prompt: labels.full_name,
      input: { kind: "text" },
      schema: shape.full_name,
    },
    {
      id: "social_name",
      prompt: labels.social_name,
      help: descriptions.social_name,
      input: { kind: "text" },
      schema: shape.social_name,
      refine: (value, answers: Answers) => {
        // Compared after the same normalising the schema applies, because that
        // is the pair that would reach the profile: "MARIA  SILVA" and "maria
        // silva" are one name by the time either is written down.
        const social = normalizeName(asText(value)).toLowerCase()
        const full = normalizeName(asText(answers.full_name)).toLowerCase()

        return social && social === full
          ? { ok: false, message: basicDataValidation.socialNameMustDiffer }
          : null
      },
    },
    {
      id: "date_of_birth",
      prompt: labels.date_of_birth,
      input: { kind: "date" },
      schema: shape.date_of_birth,
    },
    {
      id: "where_lives",
      prompt: labels.where_lives,
      help: descriptions.where_lives,
      input: { kind: "text" },
      schema: shape.where_lives,
    },
    {
      id: "how_came_to_us",
      prompt: labels.how_came_to_us,
      help: descriptions.how_came_to_us,
      input: { kind: "text" },
      schema: shape.how_came_to_us,
    },
    {
      id: "phone",
      prompt: labels.phone,
      help: descriptions.phone,
      input: { kind: "textnumber" },
      schema: shape.phone,
    },
    {
      id: "confirm_phone",
      prompt: labels.confirm_phone,
      help: descriptions.confirm_phone,
      input: { kind: "textnumber" },
      schema: shape.confirm_phone,
      refine: (value, answers: Answers) =>
        String(value) === String(answers.phone)
          ? null
          : { ok: false, message: basicDataValidation.phoneMismatch },
    },
    {
      id: "cpf",
      prompt: labels.cpf,
      input: { kind: "text" },
      schema: shape.cpf,
    },
    {
      id: "rg",
      prompt: labels.rg,
      input: { kind: "text" },
      schema: shape.rg,
    },
    {
      id: "rg_issuer",
      prompt: labels.rg_issuer,
      help: descriptions.rg_issuer,
      input: { kind: "text" },
      schema: shape.rg_issuer,
    },
    {
      id: "gender",
      prompt: genderPronounsOrientationCopy.labels.gender,
      input: { kind: "chips", options: toOptions(GENDERS), allowOther: true },
      schema: extra.gender,
    },
    {
      id: "orientation",
      prompt: genderPronounsOrientationCopy.labels.orientation,
      input: {
        kind: "chips",
        options: toOptions(ORIENTATIONS),
        allowOther: true,
      },
      schema: extra.orientation,
    },
    {
      id: "pronouns",
      prompt: genderPronounsOrientationCopy.labels.pronouns,
      input: { kind: "chips", options: toOptions(PRONOUNS), allowOther: true },
      schema: extra.pronouns,
    },
    {
      id: "race_color",
      prompt: genderPronounsOrientationCopy.labels.raceColor,
      input: {
        kind: "chips",
        options: toOptions(RACE_COLOR),
        allowOther: true,
      },
      schema: extra.race_color,
    },
  ]
}
