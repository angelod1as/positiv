import { zod } from "~/lib/helpers/zod"
import type { PaymentMessages } from "./payment-messages.schema"
import {
  type ClientConfig,
  type PagesSnapshot,
  type SnapshotMode,
  resolvePagesSnapshot,
  resolvePaymentMessages,
  resolveSiteSettings,
} from "./resolve-snapshot"
import { createSanityClient } from "./sanity-client.server"
import type { SiteSettings } from "./site-settings.schema"
import { siteSnapshotQuery } from "./site-snapshot-query"

export type SiteSnapshot = {
  pages: PagesSnapshot
  siteSettings: SiteSettings | null
  paymentMessages: PaymentMessages | null
}

type SiteClient = {
  fetch(query: string): Promise<unknown>
  config(): ClientConfig
}

const responseSchema = zod.object({
  pages: zod.unknown().optional(),
  siteSettings: zod.unknown().optional(),
  paymentMessages: zod.unknown().optional(),
})

export async function getSiteSnapshot(
  client: SiteClient = createSanityClient(),
  mode: SnapshotMode = "published",
): Promise<SiteSnapshot> {
  const response = responseSchema.parse(await client.fetch(siteSnapshotQuery))

  return {
    pages: resolvePagesSnapshot(response.pages, client.config(), mode),
    siteSettings: resolveSiteSettings(response.siteSettings),
    paymentMessages: resolvePaymentMessages(response.paymentMessages),
  }
}
