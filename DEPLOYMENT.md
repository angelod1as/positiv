# Deployment Guide

Deploy Positiv to your VPS using Coolify with Docker Compose.

## Prerequisites

- Coolify installed on your VPS ([installation guide](https://coolify.io/docs/installation))
- Repository connected to Coolify
- Domain configured with DNS A record pointing to your VPS IP

## Files Overview

Required files in repository:

```
docker-compose.yml  ← Defines app service with Traefik labels
Dockerfile          ← Builds the Node.js application
.env.example        ← Documents required environment variables
```

**Note:** Coolify uses Traefik for reverse proxy and automatic SSL, so no Caddy/Nginx configuration needed.

---

## Setup in Coolify

### 1. Create Application

1. **New Resource** → **Docker Compose**
2. Connect your Git repository
3. Select branch (usually `main`)
4. Specify compose file: `docker-compose.yml`

### 2. Configure Environment Variables

In Coolify dashboard → **Environment Variables**, add:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Email (AWS SES)
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=AKIAXXXXXXX
EMAIL_PASSWORD=xxx

# Scheduler
NODE_ENV=production
ENABLE_EVENT_SCHEDULER=true

# Domain (used in docker-compose.yml)
DOMAIN=yourdomain.com
```

**Complete list:** See `.env.example` in repository

### 3. Configure Domain

In Coolify dashboard → **Domains** tab:

1. Add your domain
2. Coolify automatically handles SSL via Let's Encrypt

### 4. Deploy

Click **Deploy** or enable **Auto Deploy** for automatic deployments on git push.

---

## docker-compose.yml Configuration

Your compose file should define only the **app service**. Coolify's Traefik handles reverse proxy.

**Required Traefik labels:**

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.positiv.rule=Host(`${DOMAIN}`)"
  - "traefik.http.services.positiv.loadbalancer.server.port=3000"
  - "traefik.http.routers.positiv.entrypoints=websecure"
  - "traefik.http.routers.positiv.tls.certresolver=letsencrypt"
```

Coolify automatically injects:

- `coolify.managed=true`
- `coolify.applicationId=<id>`
- Network configuration
- Health monitoring

---

## Monitoring

### Health Check

The app exposes a health endpoint:

```bash
curl https://yourdomain.com/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 86400,
  "responseTime": 5,
  "environment": "production"
}
```

### Application Logs

View in Coolify dashboard → **Logs** tab, or filter for events:

**Scheduler activity:**

```
[Scheduler] Starting event auto-publish scheduler
[Scheduler] Running event auto-publish check
[Scheduler] Found 2 event(s) to publish
[Scheduler] Published event: Summer Party (abc-123)
[Scheduler] Sent reminder emails for: Summer Party
[Scheduler] Completed: {published: 2, emailsSent: 2, errors: 0}
```

---

## Scheduled Jobs

The app runs automatic event publishing every 5 minutes using node-cron.

**Requirements:**

- `NODE_ENV=production` ✓
- `ENABLE_EVENT_SCHEDULER=true` ✓

**Manual trigger** (if scheduler fails):

```bash
POST /api/admin/auto-publish-events
# Requires admin authentication
```

**Troubleshooting:**

1. Verify environment variables are set in Coolify
2. Restart service after changing variables
3. Check logs for `[Scheduler]` startup messages

**Implementation details:** See [Scheduled Jobs Guide](docs/guides/development/scheduled-jobs.md)

---

## Troubleshooting

### App Won't Start

**Check build logs:**

1. Coolify dashboard → **Deployments** → Latest → **Build Logs**
2. Look for errors during build or startup

**Common issues:**

- Missing environment variables
- Invalid Supabase credentials
- Port conflicts (ensure 3000 is exposed)
- Dockerfile build errors

### Scheduler Not Running

**Verify environment variables:**

```bash
# In Coolify, check Environment Variables tab
NODE_ENV=production
ENABLE_EVENT_SCHEDULER=true
```

**Restart** the service after changing environment variables.

**Check logs:**
Should see `[Scheduler] Starting event auto-publish scheduler` on startup.

### Events Not Publishing

**Event must meet ALL criteria:**

- Event status = "Scheduled"
- `auto_publish = true`
- Registration start time has passed (`time_application_start <= NOW()`)
- Event hasn't started yet (`time_event_start > NOW()`)

**Verify with SQL:**

```sql
SELECT id, title, event_status, auto_publish,
       time_application_start, time_event_start
FROM events
WHERE event_status = 'Scheduled' AND auto_publish = true;
```

### SSL Not Working

**Check DNS:**

```bash
dig yourdomain.com
# Should point to your VPS IP
```

**Common issues:**

- DNS not propagated (wait up to 24 hours)
- Ports 80/443 not open on VPS
- Check Coolify logs for Let's Encrypt errors

---

## Updates

### Deploy New Changes

**Automatic:** With auto-deploy enabled, pushing to GitHub triggers deployment.

**Manual:** Coolify dashboard → **Redeploy**

### Rollback

1. **Deployments** tab → Select previous deployment
2. Click **Redeploy**

---

## Resource Management

### Recommended Limits

Configure in Coolify or docker-compose.yml:

- **Memory**: 2GB limit, 1GB reservation
- **CPU**: 2 cores limit, 1 core reservation

### Scaling

For multiple instances, use Coolify's horizontal scaling feature.

---

## Migration Notes

### From Vercel to Coolify

1. Export environment variables from Vercel
2. Import to Coolify Environment Variables
3. Update DNS to point to VPS
4. Deploy via Coolify

### From Supabase pg_cron to node-cron

The app now uses node-cron for scheduled jobs instead of Supabase pg_cron.

**Disable old cron job** in Supabase SQL Editor:

```sql
SELECT cron.unschedule('update-event-statuses-automatically');
```

**Benefits of node-cron:**

- ✅ Sends reminder emails automatically
- ✅ Works with any database (not Supabase-specific)
- ✅ Easier to test and monitor
- ✅ Visible in application logs
- ✅ Manual trigger endpoint available

---

## Support

**Check logs:**

```bash
# In Coolify dashboard → Logs tab
# Filter for specific events
```

**Health check:**

```bash
curl https://yourdomain.com/health
```

**Resources:**

- [Coolify Documentation](https://coolify.io/docs)
- [Scheduled Jobs Guide](docs/guides/development/scheduled-jobs.md)
- Repository issues
