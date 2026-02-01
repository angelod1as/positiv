/**
 * Newsletter campaign constants
 */

/**
 * Number of days before registration opening to send pre-opening reminder
 */
export const PRE_OPENING_REMINDER_DAYS_BEFORE = 3

/**
 * Newsletter retry configuration constants
 */

/** Maximum number of retry attempts before giving up */
export const MAX_RETRY_COUNT = 5

/**
 * Exponential backoff schedule in minutes for newsletter sync retries
 * - Attempt 1: Immediate (0 min)
 * - Attempt 2: 5 minutes
 * - Attempt 3: 15 minutes
 * - Attempt 4: 1 hour (60 min)
 * - Attempt 5: 6 hours (360 min)
 * - Beyond: 24 hours (1440 min) fallback
 */
export const NEWSLETTER_RETRY_BACKOFF_MINUTES = [0, 5, 15, 60, 360]

/** Default backoff time in minutes if retry count exceeds schedule */
export const DEFAULT_BACKOFF_MINUTES = 1440 // 24 hours
