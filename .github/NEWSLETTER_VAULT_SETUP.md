# Newsletter Automation - Vault Secret Setup

This document explains how to configure Supabase Vault secrets for the newsletter campaign automation cron job.

## Required Secrets

The cron job requires two secrets to be stored in Supabase Vault:

1. **app_url** - The application URL (e.g., `https://www.positivparty.com`)
2. **internal_job_secret** - Bearer token for API authentication (matches Vercel's `INTERNAL_JOB_SECRET`)

## Setup Instructions

### For Production

1. Open Supabase Dashboard → SQL Editor
2. Execute these commands:

```sql
-- Add production app URL
SELECT vault.create_secret(
  'https://www.positivparty.com',
  'app_url',
  'Production application URL'
);

-- Add production internal job secret
-- Get the value from Vercel: Settings → Environment Variables → INTERNAL_JOB_SECRET (Production)
SELECT vault.create_secret(
  '<COPY_FROM_VERCEL_PRODUCTION_ENV>',
  'internal_job_secret',
  'Production API bearer token'
);
```

3. Verify secrets were created:
```sql
SELECT name, description FROM vault.decrypted_secrets;
```

4. Verify cron job is scheduled:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-newsletter-campaigns';
```

### For Staging

**Staging setup is NOT needed.** The cron job will automatically skip creation when Vault secrets are not present.

**Why skip staging?**
- Vercel staging URLs are dynamic (change per branch/deployment)
- Automated cron processing isn't necessary for staging
- Manual testing is sufficient: use `curl` to test the API endpoint directly

**Manual testing in staging:**
```bash
# Get INTERNAL_JOB_SECRET from Vercel staging environment variables
curl -X POST https://<your-staging-url>.vercel.app/api/process-campaigns \
  -H "Authorization: Bearer <STAGING_INTERNAL_JOB_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### For Local Development

No Vault setup needed! The cron job automatically skips creation in local development.

Add this to your `.env` file for local API testing:
```bash
# Copy the staging value from Vercel or use any test value
INTERNAL_JOB_SECRET=<your-local-test-secret>
```

## Updating Secrets

If you need to update a secret (e.g., rotating the internal job secret):

```sql
-- Update app URL
SELECT vault.update_secret(
  id := (SELECT id FROM vault.decrypted_secrets WHERE name = 'app_url' LIMIT 1),
  secret := 'https://new-url.com'
);

-- Update internal job secret
SELECT vault.update_secret(
  id := (SELECT id FROM vault.decrypted_secrets WHERE name = 'internal_job_secret' LIMIT 1),
  secret := 'new-secret-value'
);
```

## Verification

After setup, test the cron job:

1. Check cron job is scheduled:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-newsletter-campaigns';
```

2. Manually trigger the job (for testing):
```sql
SELECT cron.schedule('test-newsletter-now', '* * * * *', $$
  SELECT net.http_post(
    url := get_vault_secret('app_url') || '/api/process-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
    ),
    body := '{}'::jsonb
  );
$$);

-- Wait a minute, then check logs and unschedule test job
SELECT cron.unschedule('test-newsletter-now');
```

3. Check Vercel logs to see if API endpoint received the request

## Troubleshooting

**Cron job not running:**
- Verify secrets exist: `SELECT name FROM vault.decrypted_secrets;`
- Check cron job list: `SELECT * FROM cron.job;`
- Check pg_cron logs in Supabase Dashboard

**API returns 401 Unauthorized:**
- Verify `internal_job_secret` in Vault matches `INTERNAL_JOB_SECRET` in Vercel
- Check case sensitivity and whitespace in secrets

**Local development:**
- Cron job is automatically skipped in local Supabase (no Vault secrets)
- Add `INTERNAL_JOB_SECRET` to `.env` file for local API testing

## Security Notes

- Vault secrets are encrypted at rest using AEAD encryption
- The `get_vault_secret()` function uses `SECURITY DEFINER` to control access
- Secrets remain encrypted in database backups
- Only the `postgres` role can execute `get_vault_secret()`
