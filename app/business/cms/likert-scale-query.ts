export const likertScaleQuery = `*[_id == "likertScale"][0]{
  statements[]{ key, text }
}`
