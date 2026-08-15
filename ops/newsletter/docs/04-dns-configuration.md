# DNS Configuration

Configure DNS records to point your domain/subdomain to your VPS.

## Prerequisites

- [ ] Domain name registered
- [ ] Access to domain registrar's control panel
- [ ] VPS IP address from Hostinger
- [ ] Coolify and Listmonk deployed

## Understanding DNS Basics

### What is DNS?

DNS (Domain Name System) translates human-readable domains to IP addresses:

```
newsletter.yourdomain.com → 185.123.45.67
```

### How It Works for Your Setup

```
User types:
newsletter.yourdomain.com
         ↓
DNS Lookup:
"Where is newsletter.yourdomain.com?"
         ↓
DNS Server responds:
"185.123.45.67"
         ↓
Browser connects to:
VPS at 185.123.45.67
         ↓
Traefik (Coolify) routes to:
Listmonk container
```

### DNS Record Types

**A Record:** Points domain to IPv4 address
- Example: `newsletter.yourdomain.com` → `185.123.45.67`
- **This is what you need!**

**AAAA Record:** Points domain to IPv6 address (optional)
- Example: `newsletter.yourdomain.com` → `2001:db8::1`

**CNAME Record:** Points domain to another domain
- Example: `www.yourdomain.com` → `yourdomain.com`
- **Don't use for root domains!**

**MX Record:** Email server routing (not needed for this setup)

## Current Setup: Subdomain Only

Since your main domain (`yourdomain.com`) is on Vercel, you'll create a **subdomain** for the newsletter:

**Setup:**
- `yourdomain.com` → Vercel (unchanged)
- `newsletter.yourdomain.com` → VPS (new A record)

**Result:**
- Main site stays on Vercel
- Newsletter runs on VPS
- No interference between them

## Step-by-Step: Add DNS Record

### Option 1: Cloudflare (Recommended)

If your domain uses Cloudflare:

1. Log into Cloudflare dashboard
2. Select your domain
3. Go to **DNS** section
4. Click **"+ Add record"**
5. Configure:
   - **Type:** A
   - **Name:** newsletter
   - **IPv4 address:** YOUR_VPS_IP
   - **Proxy status:** DNS only (gray cloud, not orange)
   - **TTL:** Auto
6. Click **"Save"**

**Important:** Use "DNS only" (gray cloud) for initial setup. Once working, you can enable proxy (orange cloud) for DDoS protection.

### Option 2: Namecheap

If your domain is registered with Namecheap:

1. Log into Namecheap account
2. Go to **Domain List**
3. Click **"Manage"** next to your domain
4. Go to **Advanced DNS** tab
5. Click **"Add New Record"**
6. Configure:
   - **Type:** A Record
   - **Host:** newsletter
   - **Value:** YOUR_VPS_IP
   - **TTL:** 300 (5 minutes)
7. Click **"Save"**

### Option 3: GoDaddy

If your domain is registered with GoDaddy:

1. Log into GoDaddy account
2. Go to **My Products**
3. Click **DNS** next to your domain
4. Click **"Add"** in DNS Records section
5. Configure:
   - **Type:** A
   - **Name:** newsletter
   - **Value:** YOUR_VPS_IP
   - **TTL:** 600 seconds (10 minutes)
6. Click **"Save"**

### Option 4: Google Domains / Squarespace

If your domain is on Google Domains (now Squarespace):

1. Log into Squarespace Domains
2. Select your domain
3. Go to **DNS Settings**
4. Click **"Add Record"**
5. Configure:
   - **Type:** A
   - **Host:** newsletter
   - **Value:** YOUR_VPS_IP
   - **TTL:** 3600
6. Click **"Save"**

### Option 5: Registro.br (Brazilian Domains)

If your domain is `.com.br` registered with Registro.br:

1. Log into Registro.br
2. Go to **DNS** section
3. Add new entry:
   - **Nome:** newsletter.yourdomain.com.br
   - **Tipo:** A
   - **Dados:** YOUR_VPS_IP
4. Click **"Adicionar"**
5. Wait for propagation (can take up to 24h for .br domains)

### Other Registrars

**General steps for any registrar:**

1. Find DNS settings (usually called "DNS Management", "DNS Records", or "Advanced DNS")
2. Add new record
3. Select type: **A**
4. Name/Host: **newsletter**
5. Value/Points to: **YOUR_VPS_IP**
6. TTL: **300-3600** (lower = faster updates)
7. Save changes

## DNS Propagation

### What is DNS Propagation?

After creating a DNS record, it takes time for the change to spread across all DNS servers worldwide.

**Typical times:**
- 5-30 minutes (most cases)
- Up to 48 hours (worst case)
- Cloudflare: 2-5 minutes (fastest)
- Registro.br: 2-24 hours (slowest)

### How to Test Propagation

#### Method 1: nslookup (Command Line)

```bash
# From your local machine
nslookup newsletter.yourdomain.com

# Expected output when propagated:
Name:    newsletter.yourdomain.com
Address: 185.123.45.67
```

**Not propagated yet:**
```
server can't find newsletter.yourdomain.com: NXDOMAIN
```

#### Method 2: dig (More Detailed)

```bash
dig newsletter.yourdomain.com +short

# Should return: 185.123.45.67
```

#### Method 3: Online Tools

**DNSChecker.org** (Recommended)
- Visit: https://dnschecker.org
- Enter: `newsletter.yourdomain.com`
- Shows propagation status globally
- Green checkmarks = propagated

**What's My DNS?**
- Visit: https://www.whatsmydns.net
- Enter: `newsletter.yourdomain.com`
- Type: A
- Shows results from different countries

### Force DNS Cache Refresh (Local)

If DNS is propagated but you still can't access:

**Windows:**
```cmd
ipconfig /flushdns
```

**macOS:**
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux:**
```bash
sudo systemd-resolve --flush-caches
```

## Verify Complete Setup

Once DNS is propagated, test the full chain:

### Test 1: DNS Resolution

```bash
nslookup newsletter.yourdomain.com
# Must return: YOUR_VPS_IP
```

### Test 2: HTTP Connection

```bash
curl -I http://newsletter.yourdomain.com

# Expected output:
HTTP/1.1 301 Moved Permanently
Location: https://newsletter.yourdomain.com/
```

This shows:
- ✅ DNS working
- ✅ Traefik routing working
- ✅ HTTPS redirect active

### Test 3: HTTPS Connection

```bash
curl -I https://newsletter.yourdomain.com

# Expected output:
HTTP/2 200
content-type: text/html; charset=utf-8
```

This shows:
- ✅ SSL certificate active
- ✅ Listmonk responding

### Test 4: Browser Access

Open browser:
1. Go to: `https://newsletter.yourdomain.com`
2. Should see: Listmonk login page
3. Check: Green padlock (SSL active)
4. Click padlock: Certificate should be valid (Let's Encrypt)

## Troubleshooting DNS Issues

### Issue: DNS Not Propagating After Hours

**Check:**

1. **Verify record was saved:**
   - Log back into registrar
   - Confirm A record exists
   - Verify IP address is correct

2. **Check TTL:**
   - High TTL (86400 = 24h) takes longer
   - Lower TTL to 300 (5 min)
   - Old TTL must expire first

3. **Check nameservers:**
   ```bash
   dig NS yourdomain.com +short
   ```
   Should return your registrar's nameservers

4. **Clear registrar cache:**
   - Some registrars cache DNS
   - Look for "refresh DNS" or "clear cache" button

### Issue: DNS Points to Wrong IP

**Solution:**

1. Double-check VPS IP in Hostinger panel
2. Update A record with correct IP
3. Wait for TTL expiration
4. Test again

### Issue: SSL Certificate Fails After DNS Setup

**This is common! Let's Encrypt needs time.**

**Check requirements:**

1. **DNS propagated globally:**
   ```bash
   # Test from different DNS servers
   dig @8.8.8.8 newsletter.yourdomain.com +short
   dig @1.1.1.1 newsletter.yourdomain.com +short
   # Both must return VPS IP
   ```

2. **Port 80 accessible:**
   ```bash
   # From local machine
   curl http://newsletter.yourdomain.com
   # Must connect (even if redirects)
   ```

3. **Wait 10-15 minutes** after DNS propagation
4. **Retry SSL in Coolify:**
   - Go to service → Domains
   - Toggle SSL off, save
   - Toggle SSL on, save
   - Wait 5 minutes

### Issue: Works on Desktop but Not Mobile

**Cause:** DNS cache on device/network

**Solutions:**

1. **Wait longer** (mobile carriers cache DNS more)
2. **Switch to mobile data** (instead of WiFi)
3. **Use private/incognito mode**
4. **Restart device**

### Issue: "Too Many Redirects" Error

**Cause:** Cloudflare proxy + Coolify both doing SSL

**Solution:**

1. Go to Cloudflare → SSL/TLS
2. Set mode to: **Full** (not "Flexible")
3. Or disable Cloudflare proxy (gray cloud)

## Advanced DNS Scenarios

### Scenario 1: Add Main App Later

When you migrate main app from Vercel to VPS:

**Current:**
```
yourdomain.com                 → Vercel (A/CNAME record)
newsletter.yourdomain.com      → VPS (A record)
```

**Future:**
```
yourdomain.com                 → VPS (A record - UPDATE THIS)
www.yourdomain.com             → VPS (A record - ADD THIS)
newsletter.yourdomain.com      → VPS (A record - KEEP AS IS)
```

**Steps:**
1. Deploy main app to Coolify
2. Test with IP: `http://YOUR_VPS_IP:3000`
3. Update A record: `yourdomain.com` → `YOUR_VPS_IP`
4. Add A record: `www.yourdomain.com` → `YOUR_VPS_IP`
5. Wait for propagation (5-30 min)
6. Enable SSL in Coolify for both domains

**No downtime:** Use low TTL (300) before migration for fast updates.

### Scenario 2: Multiple Subdomains

Add more services to VPS:

```
yourdomain.com                 → Vercel (unchanged)
newsletter.yourdomain.com      → VPS → Listmonk
admin.yourdomain.com           → VPS → Admin Dashboard (future)
api.yourdomain.com             → VPS → API Server (future)
```

**For each subdomain:**
1. Add A record: `subdomain` → `YOUR_VPS_IP`
2. In Coolify, add domain to respective service
3. Enable SSL

**Coolify handles routing automatically!**

### Scenario 3: WWW vs Non-WWW

**Option A: Both work (recommended):**
```
yourdomain.com         → VPS
www.yourdomain.com     → VPS
```

Add both A records with same IP.

**Option B: Redirect www to non-www:**
```
yourdomain.com         → VPS (A record)
www.yourdomain.com     → yourdomain.com (CNAME)
```

Coolify will redirect www → non-www automatically.

### Scenario 4: Using Cloudflare (DDoS Protection)

**Benefits:**
- DDoS protection
- CDN (faster loading)
- Web Application Firewall (WAF)
- Analytics

**Setup:**

1. **Move nameservers to Cloudflare:**
   - Add domain to Cloudflare
   - Update nameservers at registrar
   - Wait 24-48h for nameserver change

2. **Add DNS records in Cloudflare:**
   - Same A records as before
   - Enable proxy (orange cloud) after SSL works

3. **Cloudflare SSL settings:**
   - SSL/TLS mode: **Full (Strict)**
   - Always Use HTTPS: ON
   - Automatic HTTPS Rewrites: ON

**Important:** Get SSL working first, then enable Cloudflare proxy.

## DNS Configuration for Different Use Cases

### Use Case 1: Testing Before Production

**Test subdomain before going live:**

```
test.yourdomain.com → VPS
```

1. Add A record: `test` → `YOUR_VPS_IP`
2. Deploy to test subdomain
3. Test thoroughly
4. When ready, update production DNS

### Use Case 2: Staging + Production

**Separate environments:**

```
newsletter.yourdomain.com      → VPS (Production)
staging.newsletter.yourdomain.com → VPS (Staging)
```

Deploy both in Coolify with different domains.

### Use Case 3: Geographic Load Balancing (Advanced)

For future growth, use Cloudflare Load Balancer:

```
newsletter.yourdomain.com → Load Balancer
                           → VPS 1 (São Paulo)
                           → VPS 2 (USA)
```

Route users to nearest server automatically.

## DNS Security Best Practices

### Enable DNSSEC (Optional)

DNSSEC prevents DNS spoofing.

**Check if supported:**
```bash
dig +dnssec yourdomain.com
```

**Enable in registrar:**
- Cloudflare: Automatic
- Namecheap: DNS → DNSSEC
- GoDaddy: DNS Settings → DNSSEC

### CAA Records (Optional)

Specify which Certificate Authorities can issue SSL for your domain:

```
Type: CAA
Name: yourdomain.com
Value: 0 issue "letsencrypt.org"
```

Prevents unauthorized SSL certificates.

### Hide Origin IP (Cloudflare)

If using Cloudflare proxy:
- Origin IP is hidden
- All traffic goes through Cloudflare
- Protects against direct attacks

**Without Cloudflare:** Your VPS IP is public (that's okay for now).

## DNS Checklist for Production

Before going live:

- [ ] A record created: `newsletter.yourdomain.com` → `YOUR_VPS_IP`
- [ ] DNS propagated globally (check dnschecker.org)
- [ ] HTTP access works: `curl http://newsletter.yourdomain.com`
- [ ] HTTPS access works: `curl https://newsletter.yourdomain.com`
- [ ] SSL certificate valid (green padlock in browser)
- [ ] TTL set to reasonable value (300-3600)
- [ ] Nameservers correct: `dig NS yourdomain.com`
- [ ] No DNS errors: `dig newsletter.yourdomain.com` shows no errors
- [ ] Mobile access tested
- [ ] Different browsers tested (Chrome, Firefox, Safari)

## Monitoring DNS Health

### Tools for Ongoing Monitoring

**DNS Performance:**
- https://www.dnsperf.com - DNS speed tests
- https://dnschecker.org - Global propagation checks

**SSL Certificate Monitoring:**
- https://www.ssllabs.com/ssltest/ - SSL configuration test
- Coolify dashboard shows certificate expiration (auto-renewed)

**Uptime Monitoring:**
- UptimeRobot (free tier: 50 monitors)
- Pingdom
- StatusCake

**Setup alert if `newsletter.yourdomain.com` is down!**

### Common DNS Problems to Watch

1. **Certificate expiration** (Coolify auto-renews, but monitor)
2. **DNS record deletion** (accidental changes in registrar)
3. **Nameserver changes** (if registrar is compromised)
4. **TTL too high** (makes updates slow)

## Future Migrations

### When Migrating Main App from Vercel

**Preparation checklist:**

1. **Lower TTL 24h before migration:**
   - Change `yourdomain.com` TTL to 300 (5 min)
   - Wait 24h for old TTL to expire

2. **Deploy to VPS first:**
   - Test with VPS IP directly
   - Ensure everything works

3. **Update DNS:**
   - Change A record: `yourdomain.com` → `YOUR_VPS_IP`
   - Add A record: `www.yourdomain.com` → `YOUR_VPS_IP`

4. **Monitor:**
   - Check old Vercel logs (traffic should drop)
   - Check VPS logs (traffic should increase)
   - Test from multiple locations

5. **After 48h:**
   - Remove old DNS records
   - Increase TTL back to 3600

**Detailed guide:** Will be in `05-main-app-migration.md` (create when ready)

## Quick Reference

### Your Current DNS Setup

```
Domain: yourdomain.com
├── A Record → Vercel (main site)
└── A Record (newsletter) → YOUR_VPS_IP
    └── Coolify/Traefik routes to Listmonk
```

### Essential DNS Commands

```bash
# Check DNS
nslookup newsletter.yourdomain.com

# Detailed DNS info
dig newsletter.yourdomain.com

# Check from specific DNS server
dig @8.8.8.8 newsletter.yourdomain.com

# Trace DNS resolution
dig +trace newsletter.yourdomain.com

# Check all DNS records
dig newsletter.yourdomain.com ANY
```

### DNS Record Template

For future reference when adding new services:

```
Type: A
Name: [subdomain]
Value: [YOUR_VPS_IP]
TTL: 300
```

**Example:**
```
Type: A
Name: api
Value: 185.123.45.67
TTL: 300
```

Result: `api.yourdomain.com` → VPS

## Conclusion

DNS is now configured and your newsletter system is accessible via:

**https://newsletter.yourdomain.com**

### What You Achieved

✅ Subdomain points to VPS
✅ SSL certificate active (HTTPS)
✅ Main domain still on Vercel (unchanged)
✅ Coolify routing traffic correctly
✅ Newsletter system publicly accessible

### Next Steps

**Immediate:**
1. Test thoroughly from different devices/networks
2. Set up uptime monitoring
3. Share newsletter URL with team
4. Configure email sending (SMTP) if not done

**Future:**
1. Monitor DNS propagation globally
2. Consider Cloudflare for added protection
3. Plan main app migration (when ready)
4. Set up automated DNS monitoring

## Support Resources

**DNS Issues:**
- Your registrar's support (they manage DNS)
- Cloudflare Community (if using Cloudflare)
- DNSchecker.org (testing tool)

**SSL Issues:**
- Let's Encrypt Community
- Coolify Discord/GitHub Issues

**VPS/Hosting Issues:**
- Hostinger Support (24/7 live chat)

---

**Navigation:**
- [← Back: Listmonk Deployment](./03-listmonk-deployment.md)
- [↑ Back to Index](./index.md)

**Congratulations! 🎉**

Your newsletter system is now fully deployed and accessible. Check the index for maintenance tips and troubleshooting guides.
