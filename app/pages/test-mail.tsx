import { Form } from "react-router"
import { Button } from "~/components/atoms/button/button"
import { sendMail, type MailOptions } from "~/lib/email/email"
import type { Route } from "./+types/test-mail"

export async function action({}: Route.ActionArgs) {
  const options: MailOptions = {
    to: "oiangelodias@gmail.com",
    subject: `Testmail`,
    text: "Email text",
    html: "Email text",
  }

  try {
    await sendMail(options)
  } catch (error) {
    console.error("MAIL ERROR", error)
  }

  return {}
}

const TestMail = () => {
  return (
    <Form method="POST">
      <Button type="submit">Submit</Button>
    </Form>
  )
}

export default TestMail
