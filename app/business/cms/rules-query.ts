export const ruleProjection = `{ _key, title, body, highlight{ title, body } }`

export const rulesQuery = `*[_id == "rules"][0]{
  generalRules[]${ruleProjection},
  agreements[]${ruleProjection},
  privateRules[]${ruleProjection}
}`
