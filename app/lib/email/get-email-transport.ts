import * as aws from "@aws-sdk/client-ses"
import { defaultProvider } from "@aws-sdk/credential-provider-node"
import nodemailer from "nodemailer"
import { isProd } from "../helpers/is-prod.server"

export function getEmailTransport() {
  const prod = isProd()
  console.log(`\n\n:DEV prod:\n`, prod, `\n\n`)

  if (prod) {
    const ses = new aws.SES({
      apiVersion: "2010-12-01",
      region: "sa-east-1",
      credentials: defaultProvider(),
    })

    return nodemailer.createTransport({
      SES: { ses, aws },
      sendingRate: 1, // max 1 messages/second
      maxConnections: 1,
    })
  }

  return nodemailer.createTransport({
    host: "localhost",
    port: 1025,
    ignoreTLS: true,
  })
}
