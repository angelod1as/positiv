export const emailTemplatesQuery = `*[_id == "emailTemplates"][0]{
  paymentLink{ subject, heading, body }
}`
