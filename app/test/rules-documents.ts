import type { Rule, Rules } from "~/business/cms/rules.schema"

const rule = (key: string, title: string, text: string): Rule => ({
  _key: key,
  title,
  body: [
    {
      _type: "block",
      _key: `${key}-p`,
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
    },
  ],
  highlight: null,
})

export const rulesFixture: Rules = {
  generalRules: {
    title: "Regras Gerais",
    subtitle: "Para todo mundo",
    rules: [
      rule("sim", "👍 Apenas SIM é SIM 👍", "Essa é nossa regra de ouro do rolê."),
    ],
  },
  agreements: {
    title: "Acordos",
    subtitle: null,
    rules: [
      rule("pontualidade", "⏰ Pontualidade 🕐", "Por favor, seja pontual."),
    ],
  },
  privateRules: {
    title: "Regras Privadas",
    subtitle: null,
    rules: [
      rule("marmitaria", "🥡 A Positiv não é marmitaria 🥡", "Respeito, por favor."),
    ],
  },
}
