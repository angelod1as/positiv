# Coolify Installation

Install Coolify platform for managing Docker applications with a web interface.

## Prerequisites

- [ ] Completed [VPS Initial Setup](./01-vps-initial-setup.md)
- [ ] SSH access to VPS
- [ ] Firewall configured (ports 80, 443, 8000 open)
- [ ] At least 7GB free RAM

## What is Coolify?

Coolify is a self-hosted platform that provides:
- Web UI for deploying applications
- Automatic SSL certificates (Let's Encrypt)
- Built-in reverse proxy (Traefik)
- Docker container management
- Git integration for deployments

Think of it as "Vercel/Netlify for your own server."

## Step 1: Verify Prerequisites

Before installing, confirm your VPS is ready:

```bash
# Check Docker is NOT already installed (Coolify will install it)
docker --version
# Should show: bash: docker: command not found (that's good!)

# Check available RAM
free -h
# Should show ~8GB total

# Check disk space
df -h
# Should show 90+ GB available

# Verify firewall
ufw status
# Should show ports 22, 80, 443, 8000 ALLOW
```

## Step 2: Run Coolify Installer

Coolify provides a one-line installation script. This will:
1. Install Docker and Docker Compose
2. Download Coolify
3. Start Coolify services
4. Set up reverse proxy (Traefik)

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

**What you'll see:**

```
Coolify Installer
=====================================
Checking system requirements...
✓ Debian 12 detected
✓ 8 GB RAM available
✓ 95 GB disk available

Installing Docker...
Installing Docker Compose...
Downloading Coolify...
Starting Coolify services...

=====================================
Coolify installed successfully! 🎉
=====================================

Access Coolify at: http://YOUR_VPS_IP:8000

Note: Initial setup may take 2-3 minutes.
```

**Installation time:** 5-10 minutes

## Step 3: Wait for Coolify to Start

Coolify needs a few minutes to fully initialize.

```bash
# Watch Coolify startup
docker logs -f coolify
```

**Wait until you see:**
```
Coolify is ready! 🚀
Listening on http://0.0.0.0:8000
```

**Press `Ctrl + C` to stop watching logs.**

## Step 4: Access Coolify Dashboard

Open your web browser and navigate to:

```
http://YOUR_VPS_IP:8000
```

**Example:** `http://185.123.45.67:8000`

**You should see:** Coolify welcome/setup screen

**If you see "Connection refused" or timeout:**
- Wait 2-3 more minutes (Coolify might still be starting)
- Check firewall: `ufw status` (port 8000 must be open)
- Check Coolify is running: `docker ps | grep coolify`

## Step 5: Complete Initial Setup Wizard

### 5.1 Create Root Account

On the first screen:

1. **Email:** Enter your email (used for SSL certificates and login)
2. **Password:** Choose a strong password (save this somewhere safe!)
3. Click **"Setup Account"**

**Example:**
```
Email: you@example.com
Password: [your secure password]
```

### 5.2 Configure Server

Coolify will detect your server automatically:

1. **Server Name:** Give it a name (e.g., "Hostinger VPS")
2. **IP Address:** Should auto-detect your VPS IP
3. Click **"Continue"**

### 5.3 System Check

Coolify will verify:
- ✅ Docker is running
- ✅ Network connectivity
- ✅ Disk space
- ✅ Memory available

All should be green checkmarks. Click **"Finish Setup"**.

## Step 6: Dashboard Tour

You're now on the Coolify dashboard!

### Main Sections:

**Projects**
- Where you organize your applications
- Create one project per application (or group related apps)

**Resources**
- Individual applications, databases, services
- This is where you'll add Listmonk

**Servers**
- Your VPS details
- System resource monitoring

**Settings**
- Global Coolify configuration
- Email, security, backups

## Step 7: Verify Docker Installation

Coolify installed Docker for you. Let's verify:

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version

# View running containers
docker ps
```

**Expected output:**
```
Docker version 24.0.7, build afdd53b
Docker Compose version v2.23.0

CONTAINER ID   IMAGE              STATUS          PORTS
abc123def456   coolify:latest     Up 5 minutes    0.0.0.0:8000->8000/tcp
xyz789ghi012   traefik:latest     Up 5 minutes    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

You should see at least:
- **coolify** container (the dashboard)
- **traefik** container (reverse proxy)
- **postgresql** container (Coolify's database)

## Step 8: Configure Coolify Settings (Optional)

### 8.1 Enable Email Notifications

Go to: **Settings → Email Configuration**

Configure SMTP to receive deployment notifications (optional):

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: [app password]
From Email: your-email@gmail.com
```

**Skip this if:** You don't need email alerts yet.

### 8.2 Configure Automatic Backups

Go to: **Settings → Backup**

Set up automated backups (optional for now).

## Step 9: Secure Coolify Dashboard (Important!)

Right now, Coolify is accessible to anyone who knows your IP address. Let's restrict access.

### Option A: Restrict by IP (Recommended for Testing)

If you have a static IP at home/office:

```bash
# Remove open access to port 8000
ufw delete allow 8000/tcp

# Allow only your IP (replace with your actual IP)
ufw allow from YOUR_HOME_IP to any port 8000 proto tcp

# Verify
ufw status
```

**Find your IP:** Visit https://whatismyipaddress.com/

**Example:**
```bash
ufw allow from 201.45.123.89 to any port 8000 proto tcp
```

### Option B: Use SSH Tunnel (Most Secure)

Access Coolify through an encrypted SSH tunnel:

```bash
# From your local machine (not VPS), run:
ssh -L 8000:localhost:8000 root@YOUR_VPS_IP
```

Then access Coolify at: `http://localhost:8000`

**Benefits:**
- Coolify never exposed to internet
- Encrypted connection
- No IP restrictions needed

**Downside:** Must keep terminal open

### Option C: Keep Open (Not Recommended)

Leave port 8000 open to the world.

**Only do this if:**
- Testing/learning environment
- Plan to add authentication layer later
- Using strong password

## Step 10: System Resource Check

Monitor what Coolify is using:

```bash
# Real-time view (press 'q' to exit)
htop

# Quick check
docker stats --no-stream
```

**Expected resource usage:**

```
CONTAINER       CPU %    MEM USAGE / LIMIT     MEM %
coolify         2%       150MB / 8GB           1.8%
traefik         1%       50MB / 8GB            0.6%
postgresql      1%       100MB / 8GB           1.2%
```

**Total Coolify overhead:** ~300-500MB RAM (as expected)

## Verification Checklist

Before deploying applications:

- [ ] Can access Coolify at `http://YOUR_VPS_IP:8000`
- [ ] Logged into Coolify dashboard
- [ ] See "Servers" showing your VPS with green status
- [ ] Docker containers running (check with `docker ps`)
- [ ] At least 7GB RAM still available
- [ ] Coolify dashboard access secured (IP restriction or SSH tunnel)

## Troubleshooting

### Can't Access Coolify Dashboard

**Issue:** Browser shows "Connection refused" or timeout

**Solutions:**

1. **Wait longer:** Coolify takes 2-3 minutes after installation
   ```bash
   docker logs -f coolify
   # Wait for "Coolify is ready!"
   ```

2. **Check Coolify is running:**
   ```bash
   docker ps | grep coolify
   # Should show coolify container "Up"
   ```

3. **Check firewall:**
   ```bash
   ufw status
   # Port 8000 must show ALLOW
   ```

4. **Restart Coolify:**
   ```bash
   docker restart coolify
   # Wait 1-2 minutes, try again
   ```

### Installation Script Fails

**Issue:** Installer shows errors

**Common causes:**

1. **Insufficient resources:**
   ```bash
   free -h
   # Must have 7+ GB RAM
   ```

2. **Docker already installed:**
   ```bash
   docker --version
   # If shows version, remove Docker first:
   apt remove docker docker-engine docker.io containerd runc
   # Then retry Coolify installer
   ```

3. **Network issues:**
   ```bash
   curl -I https://cdn.coollabs.io
   # Should return 200 OK
   ```

### Coolify Container Keeps Restarting

**Issue:** `docker ps` shows coolify restarting

**Check logs:**
```bash
docker logs coolify --tail 50
```

**Common issues:**
- Port 8000 already in use
- Database connection failed
- Insufficient RAM

**Solution:**
```bash
# Restart all Coolify services
cd /data/coolify/source
docker compose down
docker compose up -d

# Watch startup
docker logs -f coolify
```

### "Not enough memory" Error

**Issue:** Coolify shows memory warnings

**Check available RAM:**
```bash
free -h
```

**If RAM is full:**
```bash
# Clear system cache
sync; echo 3 > /proc/sys/vm/drop_caches

# Check what's using RAM
docker stats --no-stream

# Restart VPS if needed
reboot
```

### Forgot Coolify Password

**Issue:** Can't log into dashboard

**Reset password:**
```bash
# Access Coolify container
docker exec -it coolify sh

# Reset password (replace with your email)
./coolify reset-password your@email.com

# Follow prompts to set new password
exit
```

## Understanding Coolify Architecture

What Coolify installed on your VPS:

```
┌─────────────────────────────────────┐
│         Your VPS                    │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Docker Engine               │  │
│  │                              │  │
│  │  ┌────────────────────────┐  │  │
│  │  │ Traefik (Reverse Proxy)│  │  │
│  │  │ Ports: 80, 443         │  │  │
│  │  └───────┬────────────────┘  │  │
│  │          │                    │  │
│  │  ┌───────┴────────────────┐  │  │
│  │  │ Coolify Dashboard      │  │  │
│  │  │ Port: 8000             │  │  │
│  │  └────────────────────────┘  │  │
│  │                              │  │
│  │  ┌────────────────────────┐  │  │
│  │  │ PostgreSQL (Coolify DB)│  │  │
│  │  └────────────────────────┘  │  │
│  │                              │  │
│  │  [Your apps will go here]   │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Key components:**

1. **Traefik:** Handles all incoming web traffic (HTTP/HTTPS)
   - Automatically routes requests to correct apps
   - Manages SSL certificates
   - Acts as load balancer

2. **Coolify:** Management interface
   - Web dashboard on port 8000
   - Orchestrates Docker containers
   - Handles deployments

3. **PostgreSQL:** Coolify's internal database
   - Stores Coolify configuration
   - Not for your applications (they get their own databases)

## Useful Coolify Commands

### Service Management

```bash
# Start Coolify
cd /data/coolify/source && docker compose up -d

# Stop Coolify
cd /data/coolify/source && docker compose down

# Restart Coolify
docker restart coolify

# View all Coolify containers
docker ps | grep -E 'coolify|traefik'

# Check Coolify logs
docker logs coolify --tail 100 -f
```

### System Maintenance

```bash
# Clean up unused Docker resources
docker system prune -a

# Update Coolify (from dashboard: Settings → Update)
# Or via CLI:
cd /data/coolify/source && docker compose pull && docker compose up -d

# Backup Coolify configuration
docker exec coolify backup create
```

## Security Best Practices

**What Coolify does automatically:**
✅ Reverse proxy with Traefik
✅ SSL certificate management
✅ Container isolation
✅ Automatic HTTPS redirect

**What you should do:**
⚠️ Restrict dashboard access (IP whitelist or SSH tunnel)
⚠️ Use strong passwords
⚠️ Keep Coolify updated
⚠️ Enable 2FA (in Coolify settings, if available)

## Next Steps

Coolify is now ready to deploy applications!

**→ Continue to: [Listmonk Deployment](./03-listmonk-deployment.md)**

You'll use Coolify's web interface to deploy your newsletter system.

---

**Navigation:**
- [← Back: VPS Initial Setup](./01-vps-initial-setup.md)
- [↑ Back to Index](./index.md)
- [Next: Listmonk Deployment →](./03-listmonk-deployment.md)
