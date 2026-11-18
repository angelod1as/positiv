export const likertScaleQuery = `*[_id == "likertScale"][0]{
  themes[]{ name, statements[]{ key, text } },
  venues{ question, options[]{ key, label } },
  nonMonogamySince{ question, notLivingLabel }
}`
