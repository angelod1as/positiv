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
