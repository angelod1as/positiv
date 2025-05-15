import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"
import { defaultProvider } from "@aws-sdk/credential-provider-node"
import nodemailer from "nodemailer"
import { isProd } from "../helpers/is-prod.server"

export function getEmailTransport() {
  const prod = isProd()

  if (prod) {
    const sesClient = new SESv2Client({
      region: "sa-east-1",
      credentials: defaultProvider(),
    })

    return nodemailer.createTransport({
      SES: { sesClient, SendEmailCommand },
      sendingRate: 1, // max 1 messages/second — dunno if it works
      maxConnections: 1,
    })
  }

  return nodemailer.createTransport({
    host: "localhost",
    port: 1025,
    ignoreTLS: true,
  })
}
