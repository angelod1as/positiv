export const ruleProjection = `{ _key, title, body, highlight{ title, body } }`

const partProjection = (part: string) =>
  `"${part}": { "title": ${part}Title, "subtitle": ${part}Subtitle, "rules": ${part}[]${ruleProjection} }`

export const rulesQuery = `*[_id == "rules"][0]{
  ${partProjection("generalRules")},
  ${partProjection("agreements")},
  ${partProjection("privateRules")}
}`
