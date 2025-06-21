import { composable } from "composable-functions"
import type Mail from "nodemailer/lib/mailer"
import { POSITIV_EMAIL } from "../helpers/constants"
import { getEmailTransport } from "./get-email-transport"

export interface MailOptions extends Omit<Mail.Options, "from"> {
  to?: NonNullable<Mail.Options["to"]>
  subject: NonNullable<Mail.Options["subject"]>
  text: NonNullable<Mail.Options["text"]>
  html: NonNullable<Mail.Options["html"]>
}

export const sendEmail = composable(
  async (mailOptions: MailOptions): Promise<void> => {
    const transport = getEmailTransport()

    return new Promise((resolve, reject) => {
      transport.sendMail(
        {
          from: POSITIV_EMAIL,
          ...mailOptions,
        },
        (error, info) => {
          if (error) {
            console.error("\ntransport.sendMail error", error, "\n")
            console.error("\ninfo", info, "\n")
            console.error("\nmailOptions", mailOptions, "\n")
            reject(new Error("transport.sendMail error"))
          } else {
            resolve()
          }
        },
      )
    })
  },
)
