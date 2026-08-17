import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"
import nodemailer from "nodemailer"
import { ENV } from "varlock/env"
import { isProd } from "~/lib/helpers/is-prod.server"
import { logger } from "~/lib/logger/logger.server"

const { AWS_ACCESS_KEY_ID: awsAccessKeyId, AWS_SECRET_ACCESS_KEY: awsSecretAccessKey } = ENV

export function getEmailTransport() {
  const prod = isProd()

  if (prod) {
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      logger.error("AWS SES credentials not found")
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
    port: 54325,
    ignoreTLS: true,
  })
}
