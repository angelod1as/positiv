import { db } from '~/lib/supabase/db.server'

export async function deleteNewsletter(newsletterId: string): Promise<void> {
  const result = await db
    .deleteFrom('newsletters')
    .where('id', '=', newsletterId)
    .where('status', 'in', ['draft', 'scheduled']) // Only allow deletion of draft and scheduled newsletters
    .executeTakeFirst()

  if (!result || result.numDeletedRows === 0n) {
    throw new Error('Unable to delete newsletter. It may not exist or may have already been sent.')
  }
}