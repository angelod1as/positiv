import pwLog from "e2e/helpers/log"
import Mail from "nodemailer/lib/mailer"
import { env } from "~/env.server"
import { getEmailTransport } from "./get-email-transport"

const fromEmail = env().fromEmail

export interface MailOptions extends Omit<Mail.Options, "from"> {
  to: NonNullable<Mail.Options["to"]>
  subject: NonNullable<Mail.Options["subject"]>
  text: NonNullable<Mail.Options["text"]>
  html: NonNullable<Mail.Options["html"]>
}

export const sendMail = async (mailOptions: MailOptions): Promise<void> => {
  const transport = getEmailTransport()

  pwLog(
    `\n\n:DEV mailOptions:\n`,
    "fromEmail",
    fromEmail,
    "\n",
    "mailOptions",
    mailOptions.toString(),
    `\n\n`,
  )

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
        console.error("transport.sendMail error")
        console.error("fromEmail", fromEmail)
        console.error("mailOptions", mailOptions)
        console.error(err)
        return
      }
    },
  )
}
