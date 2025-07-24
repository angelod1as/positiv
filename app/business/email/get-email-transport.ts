import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"
import nodemailer from "nodemailer"
import { env } from "~/env.server"
import { isProd } from "~/lib/helpers/is-prod.server"

const { awsAccessKeyId, awsSecretAccessKey } = env()

export function getEmailTransport() {
  const prod = isProd()

  if (prod) {
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error("Credentials not found")
    }

    const sesClient = new SESv2Client({
      region: "sa-east-1",
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
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
