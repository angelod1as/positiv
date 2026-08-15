# VPS Initial Setup

Prepare your Debian VPS with essential security and system configurations.

## Prerequisites

- [ ] VPS access credentials from Hostinger
- [ ] VPS IP address
- [ ] SSH client installed on your local machine
- [ ] Terminal/command line access

## Step 1: Initial SSH Connection

### Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with your actual IP address (e.g., `185.123.45.67`)

**First time connecting?** You'll see a message about host authenticity. Type `yes` and press Enter.

**Expected output:**

```
Welcome to Debian GNU/Linux 12 (bookworm)
...
root@hostname:~#
```

## Step 2: Update System Packages

Always start with updating the package list and upgrading existing packages.

```bash
apt update && apt upgrade -y
```

**What this does:**

- `apt update` - Downloads latest package information
- `apt upgrade -y` - Upgrades all packages (auto-confirms with `-y`)

**Expected output:**

```
Hit:1 http://deb.debian.org/debian bookworm InRelease
...
Reading package lists... Done
Building dependency tree... Done
...
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
```

**Time:** 2-5 minutes depending on updates available

## Step 3: Install Essential Packages

Install useful tools for system management and troubleshooting.

```bash
apt install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  ufw \
  ca-certificates \
  gnupg \
  lsb-release
```

**What each package does:**

- `curl` / `wget` - Download files from internet
- `git` - Version control (needed for some deployments)
- `vim` - Text editor
- `htop` - Resource monitor (CPU, RAM, processes)
- `ufw` - Uncomplicated Firewall (easier than iptables)
- `ca-certificates` - SSL/TLS certificates
- `gnupg` - Security/encryption tools
- `lsb-release` - System information

**Expected output:**

```
Reading package lists... Done
...
Setting up curl...
Setting up wget...
...
```

## Step 4: Configure Firewall (UFW)

Set up firewall rules to protect your VPS.

### Enable UFW

```bash
# Allow SSH first (IMPORTANT: don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS for web traffic
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Coolify dashboard (temporary - will restrict later)
ufw allow 8000/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status verbose
```

**Expected output:**

```
Rules updated
Rules updated (v6)
...
Firewall is active and enabled on system startup

Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
8000/tcp                   ALLOW IN    Anywhere
```

**Why these ports?**

- `22` - SSH access (you need this to connect)
- `80` - HTTP (Coolify/Let's Encrypt needs this for SSL)
- `443` - HTTPS (secure web traffic)
- `8000` - Coolify dashboard (we'll restrict this later)

## Step 5: Set Timezone (Optional but Recommended)

Set your server's timezone for accurate logs.

```bash
# List available timezones
timedatectl list-timezones | grep Sao_Paulo

# Set timezone (example: São Paulo/Brazil)
timedatectl set-timezone America/Sao_Paulo

# Verify
timedatectl
```

**Expected output:**

```
               Local time: Fri 2025-01-24 14:30:00 -03
           Universal time: Fri 2025-01-24 17:30:00 UTC
                 RTC time: Fri 2025-01-24 17:30:00
                Time zone: America/Sao_Paulo (-03, -0300)
```

**Common timezones:**

- UTC: `Etc/UTC`
- São Paulo: `America/Sao_Paulo`
- New York: `America/New_York`
- London: `Europe/London`

## Step 6: Create Non-Root User (Optional but Recommended for Security)

Instead of using root for everything, create a regular user with sudo privileges.

```bash
# Create user (replace 'youruser' with desired username)
adduser youruser

# Add to sudo group
usermod -aG sudo youruser

# Verify sudo access
su - youruser
sudo whoami
# Should output: root
exit
```

**Note:** For simplicity in this guide, we'll continue using root. In production, always use a non-root user with sudo.

## Step 7: Check System Resources

Verify your VPS specs match what you paid for.

```bash
# Check RAM
free -h

# Check CPU cores
nproc

# Check disk space
df -h

# Real-time resource monitor (press 'q' to exit)
htop
```

**Expected output for your VPS:**

```bash
# free -h
              total        used        free
Mem:           7.8Gi       400Mi       7.0Gi

# nproc
2

# df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda1        98G  2.1G   91G   3% /
```

## Step 9: Set Hostname (Optional)

Give your VPS a meaningful name.

```bash
# Set hostname
hostnamectl set-hostname newsletter-vps

# Verify
hostnamectl
```

## Verification Checklist

Before proceeding to Coolify installation:

- [ ] System packages updated
- [ ] Essential tools installed (curl, git, etc.)
- [ ] Firewall (UFW) enabled and configured
- [ ] Ports 22, 80, 443, 8000 open
- [ ] Timezone set correctly
- [ ] Can check system resources (RAM: ~8GB, CPU: 2 cores, Disk: ~100GB)

Run this command to verify everything:

```bash
echo "=== System Info ==="
lsb_release -a
echo ""
echo "=== Firewall Status ==="
ufw status
echo ""
echo "=== Resources ==="
free -h | grep Mem
echo "CPU Cores: $(nproc)"
df -h | grep -E 'Filesystem|/$'
```

**Expected output:**

```
=== System Info ===
Distributor ID: Debian
Description:    Debian GNU/Linux 12 (bookworm)
...

=== Firewall Status ===
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
8000/tcp                   ALLOW IN    Anywhere

=== Resources ===
Mem:           7.8Gi       400Mi       7.0Gi
CPU Cores: 2
/dev/vda1        98G  2.1G   91G   3% /
```

## Troubleshooting

### Can't SSH into VPS

**Issue:** Connection refused or timeout

**Solutions:**

1. Verify IP address: Check Hostinger control panel
2. Check internet connection: `ping 8.8.8.8`
3. Verify SSH service running: `systemctl status sshd`
4. Check firewall: `ufw status`

### Locked Out After UFW Enable

**Issue:** Can't connect after enabling firewall

**Solution:**

- Use Hostinger console/VNC from control panel
- Disable UFW: `ufw disable`
- Re-add SSH rule: `ufw allow 22/tcp`
- Enable again: `ufw enable`

### Package Installation Fails

**Issue:** `apt install` gives errors

**Solutions:**

1. Update package list: `apt update`
2. Fix broken packages: `apt --fix-broken install`
3. Check disk space: `df -h`
4. Clear cache: `apt clean && apt autoclean`

### UFW Commands Not Working

**Issue:** `ufw: command not found`

**Solution:**

```bash
apt update
apt install -y ufw
```

## Security Notes

**What we did:**
✅ Firewall enabled (only allow necessary ports)
✅ System updated (security patches applied)
✅ Minimal open ports (22, 80, 443, 8000)

**What we didn't cover (optional for later):**

- Fail2ban (blocks brute-force attempts)
- SSH key-only authentication
- Non-root user setup
- Automatic security updates

**Good enough for now?** Yes! Coolify will handle most security concerns.

## Next Steps

VPS is now ready for Coolify installation!

**→ Continue to: [Coolify Installation](./02-coolify-installation.md)**

---

**Navigation:**

- [← Back to Index](./index.md)
- [Next: Coolify Installation →](./02-coolify-installation.md)
