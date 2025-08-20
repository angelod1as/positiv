#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../app/types/database/database.types'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../.env') })

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

async function cleanupAllTestNewsletters() {
  console.info('🧹 Starting cleanup of all test newsletters...\n')
  
  const supabase = createSupabaseAdminClient()
  
  // Fetch all test newsletters with a broader pattern
  const { data: testNewsletters, error: fetchError } = await supabase
    .from('newsletters')
    .select('id, subject, status, created_at')
    .or(`
      subject.ilike.%Test Newsletter%,
      subject.ilike.%E2E%,
      subject.ilike.%Draft Newsletter%,
      subject.ilike.%Scheduled Newsletter%,
      subject.ilike.%Preview Test%,
      subject.ilike.%Updated Draft%,
      subject.ilike.%Newsletter to Delete%,
      subject.ilike.%Complex MDX%,
      subject.ilike.%EventCard Component%,
      subject.ilike.%Button Component%,
      subject.ilike.%Divider Component%,
      subject.ilike.%Quote Component%,
      subject.ilike.%Markdown Formatting%,
      subject.ilike.%Live Preview%,
      subject.ilike.%Invalid MDX%,
      subject.ilike.%Immediate Send%,
      subject.ilike.%to Edit%,
      subject.ilike.%Test Subject%,
      subject.ilike.%Test Content%
    `.replace(/\s+/g, '')
    )
    .order('created_at', { ascending: false })
  
  if (fetchError) {
    console.error('❌ Failed to fetch test newsletters:', fetchError)
    process.exit(1)
  }
  
  if (!testNewsletters || testNewsletters.length === 0) {
    console.info('✅ No test newsletters found to clean up')
    return
  }
  
  // Display what will be deleted
  console.info(`Found ${testNewsletters.length} test newsletters to delete:\n`)
  
  // Group by status
  const byStatus = testNewsletters.reduce((acc, newsletter) => {
    const status = newsletter.status || 'unknown'
    if (!acc[status]) acc[status] = []
    acc[status].push(newsletter)
    return acc
  }, {} as Record<string, typeof testNewsletters>)
  
  // Display summary by status
  Object.entries(byStatus).forEach(([status, newsletters]) => {
    console.info(`  ${status.toUpperCase()}: ${newsletters.length} newsletters`)
    // Show first 5 subjects as examples
    newsletters.slice(0, 5).forEach(n => {
      const date = new Date(n.created_at).toLocaleDateString()
      console.info(`    - "${n.subject}" (created: ${date})`)
    })
    if (newsletters.length > 5) {
      console.info(`    ... and ${newsletters.length - 5} more`)
    }
    console.info()
  })
  
  // Ask for confirmation
  console.info('⚠️  This action cannot be undone!')
  console.info('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n')
  
  // Wait 5 seconds for user to cancel if needed
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // Delete the newsletters
  const newsletterIds = testNewsletters.map(newsletter => newsletter.id)
  
  console.info('🗑️  Deleting newsletters...')
  
  const { error: deleteError } = await supabase
    .from('newsletters')
    .delete()
    .in('id', newsletterIds)
  
  if (deleteError) {
    console.error('❌ Failed to delete test newsletters:', deleteError)
    process.exit(1)
  }
  
  console.info(`\n✅ Successfully deleted ${testNewsletters.length} test newsletters!`)
  
  // Show remaining newsletter count
  const { count } = await supabase
    .from('newsletters')
    .select('*', { count: 'exact', head: true })
  
  console.info(`📊 Total newsletters remaining in database: ${count}`)
}

// Run the cleanup
cleanupAllTestNewsletters()
  .then(() => {
    console.info('\n✨ Cleanup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error)
    process.exit(1)
  })