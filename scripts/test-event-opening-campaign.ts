import "dotenv/config"
import { createEventOpeningCampaign } from "~/business/newsletter/create-event-opening-campaign.server"
import { kyselyDb } from "~/kysely-db"
import { LISTMONK_TEST_LIST_ID } from "~/lib/constants/constants"

async function main() {
  const eventId = process.argv[2]
  const sendImmediately = process.argv.includes("--send")

  if (!eventId) {
    console.error(
      "Usage: pnpm tsx scripts/test-event-opening-campaign.ts <event-id> [--send]",
    )
    console.error("\nOptions:")
    console.error(
      "  --send    Send the campaign immediately (default: create as draft)",
    )
    console.error("\nExample:")
    console.error("  pnpm tsx scripts/test-event-opening-campaign.ts abc-123")
    console.error(
      "  pnpm tsx scripts/test-event-opening-campaign.ts abc-123 --send",
    )
    process.exit(1)
  }

  console.info(`\n🔍 Fetching event: ${eventId}`)

  const event = await kyselyDb
    .selectFrom("events")
    .selectAll("events")
    .where("id", "=", eventId)
    .executeTakeFirst()

  if (!event) {
    console.error(`❌ Event not found: ${eventId}`)
    process.exit(1)
  }

  console.info(`✅ Found event: ${event.emoji || ""} ${event.title}`)
  console.info(`   Location: ${event.location}`)
  console.info(`   Status: ${event.event_status}`)
  console.info(
    `\n📧 Creating campaign for TEST_LIST (ID: ${LISTMONK_TEST_LIST_ID})`,
  )

  if (sendImmediately) {
    console.info(`⚠️  Campaign will be sent IMMEDIATELY`)
  } else {
    console.info(`ℹ️  Campaign will be created as DRAFT (not sent)`)
  }

  const result = await createEventOpeningCampaign({
    event,
    listIds: [LISTMONK_TEST_LIST_ID],
    sendImmediately,
  })

  if (!result.success) {
    console.error(`\n❌ Failed to create campaign:`)
    console.error(result.errors)
    process.exit(1)
  }

  const campaign = result.data

  console.info(`\n✅ Campaign created successfully!`)
  console.info(`   ID: ${campaign.data.id}`)
  console.info(`   Name: ${campaign.data.name}`)
  console.info(`   Subject: ${campaign.data.subject}`)
  console.info(`   Status: ${campaign.data.status}`)
  console.info(`\n🌐 View in Listmonk:`)
  console.info(`   http://localhost:9000/campaigns/${campaign.data.id}`)

  if (sendImmediately) {
    console.info(`\n📬 Campaign is being sent to TEST_LIST subscribers`)
  } else {
    console.info(`\n💡 To send the campaign:`)
    console.info(`   1. Open Listmonk: http://localhost:9000/campaigns`)
    console.info(`   2. Find campaign ID: ${campaign.data.id}`)
    console.info(`   3. Click "Start campaign"`)
  }

  console.info(`\n✨ Done!\n`)
}

main().catch((error) => {
  console.error(`\n❌ Error:`, error)
  process.exit(1)
})
