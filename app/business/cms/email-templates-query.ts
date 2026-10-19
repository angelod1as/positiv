export const emailTemplatesQuery = `*[_id == "emailTemplates"][0]{
  application{ subject, heading, body, importantHeading, importantLead, notes },
  paymentConfirmed{ subject, heading, body, cta, closing },
  paymentLink{ subject, heading, body },
  paymentRefund{ subject, heading, body, cta },
  registrationLimit{ subject, heading, body, cta, closing }
}`
