export const emailTemplatesQuery = `*[_id == "emailTemplates"][0]{
  application{ subject, heading, body, importantHeading, importantLead, notes },
  paymentLink{ subject, heading, body }
}`
