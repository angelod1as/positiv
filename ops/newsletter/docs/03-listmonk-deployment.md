# Listmonk Deployment

Deploy your newsletter system (Listmonk) using Coolify.

## Prerequisites

- [ ] Completed [Coolify Installation](./02-coolify-installation.md)
- [ ] Access to Coolify dashboard (`http://YOUR_VPS_IP:8000`)
- [ ] Your `docker-compose.yml` file ready
- [ ] Admin credentials chosen (username + password)

## What is Listmonk?

Listmonk is a self-hosted newsletter and mailing list manager. Features:

- Subscriber management
- Email campaign builder
- Templates and analytics
- API for integrations
- Privacy-focused (your data stays on your server)

## Preparation: Update docker-compose.yml

Before deploying, let's secure your configuration.

### Step 1: Create .env File

Create a `.env` file in the same directory as your `docker-compose.yml`:

```bash
# On your LOCAL machine, create newsletter/.env
```

Add this content:

```env
# Listmonk Admin Account (created on first install)
LISTMONK_ADMIN_USER=admin@yourdomain.com
LISTMONK_ADMIN_PASSWORD=your_secure_password_here

# Database Credentials (change these!)
POSTGRES_USER=listmonk_user
POSTGRES_PASSWORD=your_database_password_here
POSTGRES_DB=listmonk_production
```

**Important:**

- Replace `your_secure_password_here` with a strong password
- Replace `your_database_password_here` with a different strong password
- Use a real email for admin user (you'll log in with this)

**Example:**

```env
LISTMONK_ADMIN_USER=admin@yourdomain.com
LISTMONK_ADMIN_PASSWORD=MyS3cur3P@ssw0rd!2024
POSTGRES_USER=listmonk_db_user
POSTGRES_PASSWORD=D@taB@s3P@ss2024!secure
POSTGRES_DB=listmonk_prod
```

### Step 2: Update docker-compose.yml

Open your `docker-compose.yml` and make these changes:

#### 2.1 Update Database Credentials

Find this section:

```yaml
x-db-credentials:
  &db-credentials
  POSTGRES_USER: &db-user listmonk
  POSTGRES_PASSWORD: &db-password listmonk
  POSTGRES_DB: &db-name listmonk
```

Replace with:

```yaml
x-db-credentials:
  &db-credentials
  POSTGRES_USER: &db-user ${POSTGRES_USER}
  POSTGRES_PASSWORD: &db-password ${POSTGRES_PASSWORD}
  POSTGRES_DB: &db-name ${POSTGRES_DB}
```

#### 2.2 Update Hostname (Optional)

Find this line:

```yaml
hostname: listmonk.example.com
```

Change to your actual subdomain:

```yaml
hostname: newsletter.yourdomain.com
```

#### 2.3 Remove External Port Binding

Find this section:

```yaml
app:
  ports:
    - "9000:9000"
```

**Important:** Since Coolify's Traefik will handle routing, we only need internal port exposure. Change to:

```yaml
app:
  expose:
    - "9000"
```

#### 2.4 Remove Database External Port

Find this section:

```yaml
db:
  ports:
    - "127.0.0.1:5432:5432"
```

Change to:

```yaml
db:
  expose:
    - "5432"
```

**Why?** Coolify's internal network doesn't need external ports. Traefik will route traffic.

### Step 3: Final docker-compose.yml

Your updated file should look like this:

```yaml
x-db-credentials:
  &db-credentials
  POSTGRES_USER: &db-user ${POSTGRES_USER}
  POSTGRES_PASSWORD: &db-password ${POSTGRES_PASSWORD}
  POSTGRES_DB: &db-name ${POSTGRES_DB}

services:
  app:
    image: listmonk/listmonk:latest
    container_name: listmonk_app
    restart: unless-stopped
    expose:
      - "9000"
    networks:
      - listmonk
    hostname: newsletter.yourdomain.com
    depends_on:
      - db
    command:
      [
        sh,
        -c,
        "./listmonk --install --idempotent --yes --config '' && ./listmonk --upgrade --yes --config '' && ./listmonk --config ''",
      ]
    environment:
      LISTMONK_app__address: 0.0.0.0:9000
      LISTMONK_db__user: *db-user
      LISTMONK_db__password: *db-password
      LISTMONK_db__database: *db-name
      LISTMONK_db__host: listmonk_db
      LISTMONK_db__port: 5432
      LISTMONK_db__ssl_mode: disable
      LISTMONK_db__max_open: 25
      LISTMONK_db__max_idle: 25
      LISTMONK_db__max_lifetime: 300s
      TZ: America/Sao_Paulo
      LISTMONK_ADMIN_USER: ${LISTMONK_ADMIN_USER}
      LISTMONK_ADMIN_PASSWORD: ${LISTMONK_ADMIN_PASSWORD}
    volumes:
      - ./uploads:/listmonk/uploads:rw

  db:
    image: postgres:17-alpine
    container_name: listmonk_db
    restart: unless-stopped
    expose:
      - "5432"
    networks:
      - listmonk
    environment:
      <<: *db-credentials
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 6
    volumes:
      - type: volume
        source: listmonk-data
        target: /var/lib/postgresql/data

networks:
  listmonk:

volumes:
  listmonk-data:
```

## Deployment via Coolify

Now let's deploy through Coolify's web interface.

### Step 1: Upload Files to VPS

Transfer your files to the VPS:

```bash
# From your LOCAL machine (where docker-compose.yml is)
ssh root@YOUR_VPS_IP "mkdir -p /root/newsletter/uploads"
scp docker-compose.yml root@YOUR_VPS_IP:/root/newsletter/
scp .env root@YOUR_VPS_IP:/root/newsletter/
```

**Or use SFTP client** like FileZilla, Cyberduck, or VS Code's SFTP extension.

**Verify files are uploaded:**

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Check files exist
ls -la /root/newsletter/
# Should show: docker-compose.yml and .env
```

### Step 2: Create Project in Coolify

1. Open Coolify dashboard: `http://YOUR_VPS_IP:8000`
2. Log in with your credentials
3. Click **"Projects"** in sidebar
4. Click **"+ New Project"**
5. Enter:
   - **Name:** Newsletter System
   - **Description:** Listmonk newsletter manager
6. Click **"Create"**

### Step 3: Add Docker Compose Service

1. Inside your new project, click **"+ New Resource"**
2. Select **"Docker Compose"**
3. Configure:
   - **Name:** listmonk
   - **Description:** Newsletter application
4. Click **"Continue"**

### Step 4: Configure Service

#### 4.1 Docker Compose Configuration

1. In the **"Docker Compose"** tab:
   - Click **"Edit Compose File"**
   - Paste your entire `docker-compose.yml` content
   - Click **"Save"**

#### 4.2 Environment Variables

1. Click **"Environment Variables"** tab
2. Click **"+ Add"** for each variable from your `.env`:

   ```
   Name: LISTMONK_ADMIN_USER
   Value: admin@yourdomain.com

   Name: LISTMONK_ADMIN_PASSWORD
   Value: your_secure_password_here

   Name: POSTGRES_USER
   Value: listmonk_user

   Name: POSTGRES_PASSWORD
   Value: your_database_password_here

   Name: POSTGRES_DB
   Value: listmonk_production
   ```

3. Click **"Save"** after each

**Pro tip:** You can also click **"Import from .env"** and paste your entire `.env` file content.

#### 4.3 Volumes Configuration

1. Click **"Volumes"** tab
2. Verify the upload volume is mapped:
   - **Source:** `./uploads`
   - **Target:** `/listmonk/uploads`
3. Coolify handles this automatically from docker-compose.yml

### Step 5: Configure DNS First! ⚠️

**BEFORE configuring firewall and domain**, set up your DNS record:

1. Go to your domain registrar (where you bought the domain)
2. Find DNS settings
3. Add **A Record**:
   - **Type:** A
   - **Name:** newsletter
   - **Value:** YOUR_VPS_IP
   - **TTL:** 300 (5 minutes) or Auto

**Example:**

```
Type: A
Name: newsletter
Value: 185.123.45.67
TTL: 300
```

**Wait for DNS propagation:** 5-30 minutes

**Test DNS propagation:**

```bash
# From your LOCAL machine
nslookup newsletter.yourdomain.com

# Should return your VPS IP
```

**Or use online tool:** <https://dnschecker.org>

### Step 6: Configure Firewall Rules ⚠️

**CRITICAL:** Your server's firewall must allow incoming traffic on specific ports for Coolify and Let's Encrypt to work.

#### Why These Ports?

- **Port 22 (SSH):** Remote server access and management
- **Port 80 (HTTP):** Let's Encrypt HTTP validation, HTTP→HTTPS redirects
- **Port 443 (HTTPS):** Secure traffic for your applications, Let's Encrypt TLS-ALPN validation
- **Port 8000 (Optional):** Coolify dashboard access

#### How to Configure (Hostinger Example)

1. Log into your **Hostinger VPS Panel**
2. Go to **"Firewall"** or **"Security"** section
3. Click **"Add Firewall Rule"** for each port:

| Rule | Action | Protocol | Port | Source | Detail |
|------|--------|----------|------|--------|--------|
| SSH Access | Aceitar (Accept) | TCP | 22 | any | any |
| HTTP Traffic | Aceitar (Accept) | TCP | 80 | any | any |
| HTTPS Traffic | Aceitar (Accept) | TCP | 443 | any | any |
| Coolify UI | Aceitar (Accept) | TCP | 8000 | any | any |

4. Click **"Save"** after adding each rule

#### For Other Providers

- **Hetzner:** Cloud Console → Firewalls → Create/Edit Firewall
- **DigitalOcean:** Networking → Firewalls → Create Firewall
- **AWS:** EC2 → Security Groups → Edit Inbound Rules
- **Generic Linux (UFW):**

  ```bash
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 8000/tcp
  ufw enable
  ```

### Step 7: Test Firewall ✅

Before proceeding, verify your firewall rules are working:

#### Method 1: Online Port Checker (Easiest)

1. Visit: <https://www.yougetsignal.com/tools/open-ports/>
2. Enter your **VPS IP address** (e.g., `185.123.45.67`)
3. Test each port: **22, 80, 443**
4. All should show **"Open"** or **"Port is open"**

**Alternative checkers:**
- <https://portchecker.co/>
- <https://ping.eu/port-chk/>

#### Method 2: Command Line Test

From your **local machine** (not the VPS):

```bash
# Test port 80 (HTTP)
curl -v http://YOUR_VPS_IP

# Test port 443 (HTTPS)
curl -v https://YOUR_VPS_IP

# Test port 22 (SSH)
ssh root@YOUR_VPS_IP
# You should get password prompt
```

**Expected results:**

| Port | Test | Success Indicator | Failure Indicator |
|------|------|-------------------|-------------------|
| 22 | `ssh root@IP` | Password/key prompt | "Connection timed out" |
| 80 | `curl http://IP` | Any response (even 404) | "Connection timed out" |
| 443 | `curl https://IP` | Any response/SSL error | "Connection timed out" |

**✅ All ports should be reachable.** If any timeout, go back to Step 6 and verify firewall rules.

### Step 8: Configure Domain and SSL

Now configure your domain in Coolify's UI.

#### 8.1 Navigate to Service Settings

1. In **Coolify dashboard**, go to your **Newsletter System** project
2. Click on your **listmonk** service
3. Under **"Services"** section, click on **"App"** (the listmonk/listmonk:latest service)
4. Click **"Settings"** button

You should now see the service configuration page.

#### 8.2 Configure Domain

1. Find the **"Domains"** field (near the top of the settings page)
2. Enter your full domain with port:

   ```
   https://newsletter.yourdomain.com:9000
   ```

   **Important:** Include `:9000` because Listmonk listens on port 9000

3. Click **"Save"**

**Example:**
```
https://newsletter.positivparty.com:9000
```

#### 8.3 What Happens Next

Coolify automatically:

- ✓ Configures Traefik proxy to route `newsletter.yourdomain.com` → your container
- ✓ Requests SSL certificate from Let's Encrypt
- ✓ Validates domain ownership via port 443 (TLS-ALPN challenge)
- ✓ Installs certificate (usually takes 30-60 seconds)
- ✓ Enables automatic HTTP→HTTPS redirect

**You'll see:**
- Green lock icon next to domain (when SSL is active)
- Domain status shows "SSL certificate obtained"

#### 8.4 Verify SSL Certificate

Once saved, check the service page:

- **Domain** should show: `newsletter.yourdomain.com`
- **SSL Status:** Active (green lock icon)

If SSL fails:
- Check firewall: port 443 must be open
- Check DNS: domain must resolve to your VPS IP
- Wait 5 minutes and try "Regenerate Certificate" button

### Step 9: Deploy

Once DNS is propagated:

1. Back in Coolify, click **"Deploy"** button (top right)
2. Watch the deployment logs in real-time
3. Coolify will:
   - Pull Listmonk Docker image
   - Create database container
   - Initialize database schema
   - Create admin user
   - Request SSL certificate
   - Start application

**Deployment time:** 3-5 minutes

**Look for these messages:**

```
✓ Pulling listmonk/listmonk:latest
✓ Pulling postgres:17-alpine
✓ Creating network
✓ Creating volumes
✓ Starting listmonk_db
✓ Starting listmonk_app
✓ SSL certificate obtained
✓ Deployment successful
```

### Step 10: Verify Deployment

Check container status:

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Check containers are running
docker ps | grep listmonk

# Should see:
# listmonk_app    Up X minutes
# listmonk_db     Up X minutes

# Check application logs
docker logs listmonk_app --tail 50

# Should see: "Listmonk is ready" or similar
```

**In Coolify dashboard:**

- Service status should show **green "Running"**
- Domain should show **green lock icon** (SSL active)

## Accessing Listmonk

### First Access

1. Open browser: `https://newsletter.yourdomain.com`
2. You should see Listmonk login page
3. Log in with credentials from `.env`:
   - **Username:** `admin@yourdomain.com`
   - **Password:** [your password]

**What you should see:**

- Listmonk dashboard
- Empty subscribers list
- Settings menu

### Initial Configuration

#### 1. Update Settings

Go to **Settings → General**:

- **Root URL:** `https://newsletter.yourdomain.com`
- **From Email:** `newsletter@yourdomain.com`
- **Site Name:** Your newsletter name
- Click **"Save"**

#### 2. Configure SMTP (Email Sending)

Go to **Settings → SMTP**:

**Example with Gmail:**

```
Host: smtp.gmail.com
Port: 587
Auth Protocol: PLAIN
Username: your-email@gmail.com
Password: [Gmail App Password]
From Email: your-email@gmail.com
```

**Or use services like:**

- SendGrid
- Amazon SES
- Mailgun
- Postmark

**Test SMTP:** Click **"Send Test Email"**

#### 3. Set Upload Path

Go to **Settings → Media**:

- **Upload Path:** `/listmonk/uploads`
- Click **"Save"**

This matches the volume mount in docker-compose.yml.

## Testing the System

### Test 1: Create a List

1. Go to **Lists**
2. Click **"+ New"**
3. Create a test list:
   - **Name:** Test List
   - **Type:** Public
4. Click **"Save"**

### Test 2: Add a Subscriber

1. Go to **Subscribers**
2. Click **"+ New"**
3. Add yourself:
   - **Email:** <your@email.com>
   - **Name:** Your Name
   - **Lists:** Select "Test List"
4. Click **"Save"**

### Test 3: Create a Campaign

1. Go to **Campaigns**
2. Click **"+ New"**
3. Configure:
   - **Name:** Test Campaign
   - **Subject:** Test Email
   - **Lists:** Select "Test List"
   - **Content:** Write a test message
4. Click **"Save"**
5. Click **"Send"** (schedule immediately)

**Check your inbox:** You should receive the test email!

## Troubleshooting

### Can't Access Listmonk

**Issue:** Browser shows timeout or connection error

**Solutions:**

1. **Check DNS propagation:**

   ```bash
   nslookup newsletter.yourdomain.com
   # Must return VPS IP
   ```

2. **Check deployment status in Coolify:**
   - Should show green "Running"
   - Check logs for errors

3. **Check containers:**

   ```bash
   docker ps | grep listmonk
   # Both containers must be "Up"
   ```

4. **Check Traefik routing:**

   ```bash
   docker logs traefik --tail 50
   # Look for your domain
   ```

### SSL Certificate Failed

**Issue:** Coolify shows "SSL certificate request failed"

**Common causes:**

1. **DNS not propagated:**
   - Wait 30 minutes, try again
   - Test: `nslookup newsletter.yourdomain.com`
   - See [Step 5](#step-5-configure-dns-first-️)

2. **Firewall blocking ports 80 or 443:**
   - Check firewall allows both ports
   - Test with online port checker (see [Step 7](#step-7-test-firewall-))
   - Both ports MUST be open for Let's Encrypt validation

   ```bash
   # If using UFW on Linux
   ufw status
   # Must show: 80/tcp ALLOW and 443/tcp ALLOW
   ```

3. **Let's Encrypt rate limit:**
   - Limited to 5 failures per hour
   - Wait 1 hour, try again

**Solution:**

1. In Coolify, disable SSL temporarily
2. Test HTTP access: `http://newsletter.yourdomain.com`
3. Once working, re-enable SSL

### Database Connection Failed

**Issue:** Listmonk logs show "can't connect to database"

**Check database container:**

```bash
docker ps | grep listmonk_db
# Must be "Up" and "healthy"

docker logs listmonk_db --tail 50
# Look for errors
```

**Check environment variables:**

```bash
docker exec listmonk_app env | grep LISTMONK_db
# Should show correct credentials
```

**Solution:**

```bash
# Restart containers in order
docker restart listmonk_db
sleep 10
docker restart listmonk_app
```

### Admin User Not Created

**Issue:** Can't log in with admin credentials

**Check if admin was created:**

```bash
docker exec listmonk_app ./listmonk --listusers
# Should show your admin user
```

**If not found, create manually:**

```bash
docker exec -it listmonk_app sh
./listmonk --new-admin
# Follow prompts
exit
```

### Emails Not Sending

**Issue:** Campaigns stay in "Draft" or "Sending" forever

**Check SMTP configuration:**

1. Go to Settings → SMTP
2. Click "Send Test Email"
3. Check Listmonk logs:

   ```bash
   docker logs listmonk_app --tail 100
   ```

**Common issues:**

- Wrong SMTP credentials
- SMTP server blocks port (try port 465 instead of 587)
- "Less secure apps" disabled (Gmail)
- Need app-specific password (Gmail, Yahoo)

### Uploads Not Working

**Issue:** Can't upload images

**Check volume mount:**

```bash
# On VPS
ls -la /root/newsletter/uploads
# Directory should exist and be writable

# Check inside container
docker exec listmonk_app ls -la /listmonk/uploads
```

**Fix permissions:**

```bash
chmod 755 /root/newsletter/uploads
docker restart listmonk_app
```

### High Memory Usage

**Issue:** Listmonk using too much RAM

**Check resource usage:**

```bash
docker stats --no-stream | grep listmonk
```

**Typical usage:**

- listmonk_app: 100-200 MB
- listmonk_db: 50-150 MB

**If higher:**

- Check campaign queue (pause campaigns)
- Reduce database connection pool in docker-compose.yml
- Restart containers

## Resource Usage

**Expected resource consumption:**

```
Service         RAM      CPU      Disk
====================================
Listmonk App    150 MB   2-5%     50 MB
PostgreSQL      100 MB   1-3%     100 MB
Total           250 MB   3-8%     150 MB
```

**After 1 month with 10k subscribers:**

- Disk: ~500 MB (database + uploads)
- RAM: Same (~250 MB)

## Security Checklist

- [x] Database has strong password (not "listmonk")
- [x] Admin has strong password
- [x] SSL certificate active (HTTPS)
- [x] Database not exposed to internet (no external port)
- [x] Environment variables in .env (not hardcoded)
- [x] Regular backups configured (see below)

## Backup Strategy

### Manual Backup

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Backup database
docker exec listmonk_db pg_dump -U listmonk_user listmonk_production > /root/backups/listmonk-$(date +%Y%m%d).sql

# Backup uploads
tar -czf /root/backups/listmonk-uploads-$(date +%Y%m%d).tar.gz /root/newsletter/uploads

# Download backups to local machine
scp root@YOUR_VPS_IP:/root/backups/listmonk-* ./backups/
```

### Automatic Backups with Coolify

1. In Coolify, go to your service
2. Click **"Backups"** tab
3. Configure:
   - **Frequency:** Daily
   - **Retention:** 7 days
   - **S3 Storage:** (optional, for off-site backups)
4. Click **"Enable Backups"**

### Restore from Backup

```bash
# Stop Listmonk
docker stop listmonk_app

# Restore database
cat listmonk-20240124.sql | docker exec -i listmonk_db psql -U listmonk_user listmonk_production

# Restore uploads
tar -xzf listmonk-uploads-20240124.tar.gz -C /

# Start Listmonk
docker start listmonk_app
```

## Updating Listmonk

### Via Coolify (Recommended)

1. Go to service in Coolify
2. Click **"Redeploy"**
3. Toggle **"Pull Latest Images"**
4. Click **"Deploy"**

Coolify will:

- Pull latest listmonk/listmonk:latest
- Run database migrations automatically
- Restart application

### Manual Update

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Stop containers
docker stop listmonk_app listmonk_db

# Pull latest images
docker pull listmonk/listmonk:latest
docker pull postgres:17-alpine

# Start containers
docker start listmonk_db
sleep 10
docker start listmonk_app
```

## Performance Optimization

### For Large Subscriber Lists (100k+)

1. **Increase database connections** in docker-compose.yml:

   ```yaml
   LISTMONK_db__max_open: 50
   LISTMONK_db__max_idle: 50
   ```

2. **Add Redis for queue management:**
   - See Listmonk docs for Redis configuration

3. **Upgrade VPS** if needed (more RAM/CPU)

### For High Email Volume

1. **Use dedicated SMTP service:**
   - Amazon SES (cheap, reliable)
   - SendGrid (easy setup)
   - Mailgun (developer-friendly)

2. **Configure rate limiting** in Settings → SMTP

## Next Steps

Listmonk is now deployed and ready to use!

**Recommended next steps:**

1. **Configure SMTP** thoroughly (test with multiple email providers)
2. **Import subscribers** (CSV import available)
3. **Create email templates** for brand consistency
4. **Set up double opt-in** for GDPR compliance
5. **Configure webhook** for integration with main app

**→ Continue to: [DNS Configuration Details](./04-dns-configuration.md)**

For advanced DNS setup and troubleshooting.

---

**Navigation:**

- [← Back: Coolify Installation](./02-coolify-installation.md)
- [↑ Back to Index](./index.md)
- [Next: DNS Configuration →](./04-dns-configuration.md)
