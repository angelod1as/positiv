import Mail from "nodemailer/lib/mailer"
import { isCI } from "../helpers/is-prod"
import { getEmailTransport } from "./get-email-transport"

const fromEmail = process.env.FROM_EMAIL

export interface MailOptions extends Omit<Mail.Options, "from"> {
  to: NonNullable<Mail.Options["to"]>
  subject: NonNullable<Mail.Options["subject"]>
  text: NonNullable<Mail.Options["text"]>
  html: NonNullable<Mail.Options["html"]>
}

export const sendMail = async (mailOptions: MailOptions): Promise<void> => {
  if (isCI()) return

  const transport = getEmailTransport()

  transport.sendMail(
    {
      from: fromEmail,
      ...mailOptions,
    },
    (
      err,
      // info - for debugging
    ) => {
      if (err) {
        console.error(err)
        return
      }
    },
  )
}
