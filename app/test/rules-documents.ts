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
  generalRules: [
    rule("sim", "👍 Apenas SIM é SIM 👍", "Essa é nossa regra de ouro do rolê."),
  ],
  agreements: [
    rule("pontualidade", "⏰ Pontualidade 🕐", "Por favor, seja pontual."),
  ],
  privateRules: [
    rule("marmitaria", "🥡 A Positiv não é marmitaria 🥡", "Respeito, por favor."),
  ],
}
